import React, { useState, useEffect } from 'react';
import { Table, Input, Button } from 'antd';
import { Select, Divider, Checkbox } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { Layout } from 'antd';
import { AutoComplete } from 'antd';

const { Header, Footer, Content } = Layout;

const { Option } = Select;

const App = () => {
  const [allData, setAllData] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const navigate = useNavigate();
  const location = useLocation();

  const [allNameOptions, setAllNameOptions] = useState([]);

  useEffect(() => {
    fetch('./roles.json')
      .then(response => response.json())
      .then(fetchData => {


        setAllData(fetchData);
        setCurrentData(fetchData);

        setAllNameOptions(fetchData.map(item => item.roleName).sort());

      });

    fetch('./permissions.json')
      .then(response => response.json())
      .then(fetchData => {
        const dataObject = fetchData.reduce((obj, provider) => {

          obj = provider.operations.reduce((obj, operation) => {
            obj[operation.name.toLowerCase()] = operation;
            return obj;
          }, obj);

          if (provider.resourceTypes.length > 0) {
            obj = provider.resourceTypes.reduce((obj, providerResourceType) => {
              if (providerResourceType.operations.length > 0) {
                obj = providerResourceType.operations.reduce((obj, operation) => {
                  obj[operation.name.toLowerCase()] = operation;
                  return obj;
                }, obj);
              }
              return obj;
            }, obj);
          }

          return obj;
        }, {});


        setAllPermissions(dataObject);

      });
  }, []);


  useEffect(() => {
    // Fetch data from JSON file

    // Parse the query string from the URL
    const parsed = queryString.parse(location.search, { arrayFormat: 'bracket' });

    // Set the initial data and filter values
    handleChange(pagination, parsed);

  }, [location.search, allData, allPermissions]);


  const handleChange = (pagination, filters) => {
    setFilters(filters);
    setPagination(pagination);

    // Filter the data based on the new filters
    let currentData = allData;
    if (filters.name && filters.name.length > 0) {
      currentData = currentData.filter(item => filters.name.includes(item.roleName));
    }

    if (filters.permissions && filters.permissions.length > 0) {
      //console.log(filters.permissions)
      currentData = currentData.filter(
        item =>
          filters.permissions.every(
            permission =>
              filterPermissionsFunction(permission, item)
          )
      );
    }

    setCurrentData(currentData);
    // Update the URL with the new filter values
    navigate({
      search: queryString.stringify(filters, { arrayFormat: 'bracket' }),
    });
  };

  const handleFilterNameChange = (value) => {
    const newFilters = { ...filters, name: value };
    handleChange(pagination, newFilters);
  };

  const handleFilterActionChange = (value) => {
    const newFilters = { ...filters, permissions: value };
    handleChange(pagination, newFilters);
  };



  const filterFunction = (value, record) => {
    // Implement your business logic here
    // For now, it just checks if the record's name includes the filter value
    return record.id.includes(value);
  };


  // Helper function to check if an action matches a pattern
  const matches = (action, pattern) => {
    const regex = new RegExp('^' + pattern.split('*').join('.*') + '$');
    return regex.test(action);
  };


  const isPermissionMatch = (action, roleDefinitionActions) => {
    // Check if the action is explicitly allowed
    return roleDefinitionActions.some(pattern => matches(action, pattern));
  }


  const filterPermissionsFunction = (value, record) => {
    var action = value;
    var roleDefinition = record.permissions[0];

    console.log('myaction' + action.toLowerCase(), allPermissions, allPermissions[action.toLowerCase()]);
    var permission = allPermissions[action.toLowerCase()];
    if (permission !== undefined) {
      
      if (permission.isDataAction) {
        return (isPermissionMatch(action, roleDefinition.dataActions))
          &&
          !(isPermissionMatch(action, roleDefinition.notDataActions));
      }
      else {
        return (isPermissionMatch(action, roleDefinition.actions))
          &&
          !(isPermissionMatch(action, roleDefinition.notActions));

      }

    }
    throw new Error('action doesn\'t exist' + action.toLowerCase());
    // The action is allowed if it is allowed or a data operation is allowed,
    // and it is not disallowed and a data operation is not disallowed

  };



  const columns = [
    {
      title: 'Role ID',
      dataIndex: 'id',
      key: 'id',
      filters: Array.from(new Set(currentData.map(item => item.id))).map(id => ({ text: id, value: id })),
      //filteredValue: filters.id || null,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Name"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90, marginRight: 8 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              clearFilters();
              navigate({
                search: "",
              });
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </div>
      ),
      onFilter: filterFunction,
    },
    {
      title: () => (
        <div>
          Name
          <Select
            mode="multiple"
            showSearch
            style={{ width: 200 }}
            placeholder="Select names"
            optionFilterProp="children"
            onChange={handleFilterNameChange}
            value={filters.name}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {allNameOptions.map(item => (
              <Option key={item}>{item}</Option>
            ))}
          </Select>
        </div>
      ),
      dataIndex: 'roleName',
      key: 'name',
      //filters: Array.from(new Set(data.map(item => item.roleName))).map(roleName => ({ text: roleName, value: roleName })),
      filterMultiple: true,
      //filteredValue: filters.name || null,
      onFilter: (value, record) => record.roleName.toLowerCase().includes(value.toLowerCase()),
    },
    {
      dataIndex: 'permissions',
      key: 'permissions',
      title: () => (
        <div>
          Permissions
          <Select
            mode="tags"
            style={{ width: 200 }}
            placeholder="Provide desired actions"
            onChange={handleFilterActionChange}
            value={filters.permissions}
          >
          </Select>
        </div>
      ),
      onFilter: filterPermissionsFunction,
      filterMultiple: true,
      render: permissions => (
        <div>
          {permissions.map((permission, index) => (
            <div key={index}>
              <div>Actions:
                <ul>
                  {permission.actions.map((action, index) => (
                    <li>
                      <React.Fragment key={index}>
                        {action}
                        {index < permission.actions.length - 1 && <br />}
                      </React.Fragment>
                    </li>
                  ))}
                </ul>
              </div>
              <div>Not Actions:
                <ul>
                  {permission.notActions.map((action, index) => (
                    <li>
                      <React.Fragment key={index}>
                        {action}
                        {index < permission.actions.length - 1 && <br />}
                      </React.Fragment>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                Data Actions:
                <ul>
                  {permission.dataActions.map((action, index) => (
                    <li>
                      <React.Fragment key={index}>
                        {action}
                        {index < permission.actions.length - 1 && <br />}
                      </React.Fragment>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                Not Data Actions:
                <ul>
                  {permission.notDataActions.map((action, index) => (
                    <li>
                      <React.Fragment key={index}>
                        {action}
                        {index < permission.actions.length - 1 && <br />}
                      </React.Fragment>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <Header>
        <h1>Az Least Privilege Calculator </h1>
      </Header>
      <Content>
        <Table columns={columns} dataSource={currentData} onChange={handleChange}
          pagination={{ pageSize: 50 }} />
      </Content>
      <Footer>
        {/* Add your footer content here */}
      </Footer>
    </Layout>
  );
};

export default App;
