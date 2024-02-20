
import React, { useState, useEffect } from 'react';
import { Table, } from 'antd';
import { Select, Button } from 'antd';
import { RedoOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useMatomo } from '@datapunt/matomo-tracker-react'

import { Layout } from 'antd';

import './App.css';

const { Header, Footer, Content } = Layout;

const { Option } = Select;

const App = () => {
  const [allData, setAllData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const [allIdOptions, setAllIdOptions] = useState([]);
  const [allNameOptions, setAllNameOptions] = useState([]);
  const [allPermissionsOptions, setAllPermissionsOptions] = useState([]);


  const { trackPageView, trackEvent } = useMatomo()

  // Track page view
  React.useEffect(() => {
    trackPageView()
  }, [trackPageView])



  useEffect(() => {

    fetch('/azure-rbac-least-calculator/roles-extended.json')
      .then(response => response.json())
      .then(fetchData => {

        setLastUpdated(fetchData.lastUpdated);
        fetchData = fetchData.roles;
        setAllData(fetchData);
        setCurrentData(fetchData.sort((a, b) => {
          if (a.privileged === true && b.privileged === false) return 1;
          if (a.privileged === false && b.privileged === true) return -1;

          if (a.matchingPermissionsTotal === 0) {
            return 1;
          }

          return a.matchingPermissionsTotal - b.matchingPermissionsTotal;

        }));

        setAllIdOptions(fetchData.map(item => item.id).sort());
        setAllNameOptions(fetchData.map(item => item.roleName).sort());

      });

    fetch('/azure-rbac-least-calculator/permissions.json')
      .then(response => response.json())
      .then(fetchData => {
        const dataObject = fetchData.reduce((obj, provider) => {

          obj = provider.operations.reduce((obj, operation) => {
            obj[operation.name.trim().toLowerCase()] = operation;
            return obj;
          }, obj);

          if (provider.resourceTypes.length > 0) {
            obj = provider.resourceTypes.reduce((obj, providerResourceType) => {
              if (providerResourceType.operations.length > 0) {
                obj = providerResourceType.operations.reduce((obj, operation) => {
                  obj[operation.name.trim().toLowerCase()] = operation;
                  return obj;
                }, obj);
              }
              return obj;
            }, obj);
          }

          return obj;
        }, {});


        setAllPermissions(dataObject);
        setAllPermissionsOptions(Object.values(dataObject).map(item => item.name).sort());


      });
  }, []);

  const filterPermissionsFunction = (value, record) => {
    var action = value.trim();

    var roleDefinition = record.permissions[0];

    var permission = allPermissions[action.toLowerCase()];
    if (permission !== undefined) {

      if (permission.isDataAction) {
        return (isPermissionMatchForRoleSet(action, roleDefinition.dataActions))
          &&
          !(isPermissionMatchForRoleSet(action, roleDefinition.notDataActions));
      }
      else {
        return (isPermissionMatchForRoleSet(action, roleDefinition.actions))
          &&
          !(isPermissionMatchForRoleSet(action, roleDefinition.notActions));

      }

    }

    //watch out, this function is duplicated in extend-roles-data.js

  };


  const filterPrivilegedFunction = (value, record) => {
    var privilegedRequested = (value.trim() === 'true');

    return filterPermissionsFunction('Microsoft.Authorization/roleAssignments/write', record) === privilegedRequested;

  };


  const handleChange = (filters, dryRun = false) => {
    console.log('handleChange, filters: ' + JSON.stringify(filters) + ', dryRun: ' + dryRun);

    if (filters.permissions) {
      filters.permissions = filters.permissions.map(permission => permission.trim());
    }

    //console.log('handleChange, filters 2: ' + JSON.stringify(filters) + ', dryRun: ' + dryRun);

    setFilters(filters);

    // Filter the data based on the new filters
    let currentData = allData;

    if (filters.id && filters.id.length > 0) {
      currentData = currentData.filter(item => filters.id.includes(item.id));

      filters.id.every(
        id => trackEvent({ category: 'filtering-id', action: id })
      )
    }

    if (filters.name && filters.name.length > 0) {
      currentData = currentData.filter(item => filters.name.includes(item.roleName));

      filters.name.every(
        name => trackEvent({ category: 'filtering-name', action: name })
      )
    }

    if (filters.permissions && filters.permissions.length > 0) {
      //console.log(filters.permissions)
      currentData = currentData.filter(
        item =>
          filters.permissions.every(
            permission => filterPermissionsFunction(permission.trim(), item)
          )
      );
      currentData.filter(
        item =>
          filters.permissions.every(
            permission => trackEvent({ category: 'filtering-permission', action: permission.trim() })
          )
      );
    }

    if (filters.privileged && filters.privileged.length > 0) {

      var privilegedFilters = filters.privileged.map(privilegedRequested => (privilegedRequested === 'true'));

      currentData = currentData.filter(
        record => privilegedFilters.some(
          privilegedRequested => filterPermissionsFunction('Microsoft.Authorization/roleAssignments/write', record) === privilegedRequested
        )
      );

      filters.privileged.every(
        privilegedRequested => trackEvent({ category: 'filtering-privileged', action: privilegedRequested })
      )
    }

    setCurrentData(currentData.sort((a, b) => {
      if (a.privileged === true && b.privileged === false) return 1;
      if (a.privileged === false && b.privileged === true) return -1;

      if (a.matchingPermissionsTotal === 0) {
        return 1;
      }

      return a.matchingPermissionsTotal - b.matchingPermissionsTotal;

    }));

    // Update the URL with the new filter values
    if (dryRun !== true) {
      navigate({
        search: queryString.stringify({ ...filters }, { arrayFormat: 'bracket' }),
      });
    }
  };

  useEffect(() => {
    // Fetch data from JSON file
    // Parse the query string from the URL
    const parsed = queryString.parse(location.search, { arrayFormat: 'bracket' });

    // Set the initial data and filter values
    handleChange(parsed, true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, allData, allPermissions, allIdOptions, allNameOptions, allPermissionsOptions]);
  //, allData, allPermissions, allIdOptions, allNameOptions, allPermissionsOptions, handleChange]);

  const handleFilterIdChange = (value) => {
    const newFilters = { ...filters, id: value };
    handleChange(newFilters, false);
  };

  const handleFilterNameChange = (value) => {
    const newFilters = { ...filters, name: value };
    handleChange(newFilters, false);
  };

  const handleFilterActionChange = (value) => {
    const newFilters = { ...filters, permissions: value };
    handleChange(newFilters, false);
  };

  const handleFilterPrivilegedChange = (value) => {
    const newFilters = { ...filters, privileged: value };
    handleChange(newFilters, false);
  };

  const clearFilters = () => {
    setFilters({});

    // Delete the filters from the URL
    navigate({
      search: '',
    });
  };


  // Helper function to check if an action matches a pattern
  const matches = (action, pattern) => {
    const regex = new RegExp('^' + pattern.split('*').join('.*') + '$');
    return regex.test(action);

    //watch out, this function is duplicated in extend-roles-data.js
  };


  const isPermissionMatchForRoleSet = (action, roleDefinitionActions) => {
    // Check if the action is explicitly allowed
    return roleDefinitionActions.some(pattern => matches(action, pattern));

    //watch out, this function is duplicated in extend-roles-data.js
  }

  const isPermissionMatch = (action, allowedAction) => {
    // Check if the action is explicitly allowed
    return matches(action, allowedAction);
  }



  const columns = [
    {
      title: () => (
        <div>
          Role ID<br />
          <Select
            mode="multiple"
            showSearch
            style={{ width: '20vw', maxWidth: '200px' }}
            placeholder="Select role ID"
            optionFilterProp="children"
            onChange={handleFilterIdChange}
            value={filters.id}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {allIdOptions.map(item => (
              <Option key={item}>{item}</Option>
            ))}
          </Select>
        </div>
      ),
      dataIndex: 'id',
      key: 'id',
      filterMultiple: true,
      onFilter: (value, record) => record.roleName.toLowerCase().includes(value.trim().toLowerCase()),
    },
    {
      title: () => (
        <div>
          Name<br />
          <Select
            mode="multiple"
            showSearch
            style={{ width: '30vw', maxWidth: '400px' }}
            placeholder="Select role name"
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
      filterMultiple: true,
      onFilter: (value, record) => record.roleName.toLowerCase().includes(value.trim().toLowerCase()),
    },
    {
      dataIndex: 'permissions',
      key: 'permissions',
      title: () => (
        <div>
          Desired permissions<br />
          <Select
            mode="tags"
            style={{ width: '50vw' }}
            placeholder="Provide desired permissions"
            onChange={handleFilterActionChange}
            value={filters.permissions}
          >
            {allPermissionsOptions.map((item) => (
              <Option key={item.trim()}>{item}</Option>
            ))}
          </Select>
        </div>
      ),
      onFilter: filterPermissionsFunction,
      filterMultiple: true,
      render: (permissions, record) => (
        <div>
          {permissions.map((permission, permissionIndex) => (
            <div key={'permission-item' - permissionIndex}>
              <div className="permissions-columns">
                <div className='permissions-column-left'>
                  <strong>Included control actions:</strong>
                  <ul>
                    {permission.actions.map((roleAction, index) => {
                      var isDataAction = false;
                      var roleActionForEvaluation = roleAction.trim().toLowerCase();
                      if (allPermissions[roleActionForEvaluation] !== undefined) {
                        isDataAction = allPermissions[roleActionForEvaluation].isDataAction;
                      }

                      const permissionsText = filters.permissions && filters.permissions.length > 0 &&
                        filters.permissions
                          .map((filterAction, index) =>

                            (isPermissionMatch(filterAction, roleAction)
                              && (allPermissions[filterAction.trim().toLowerCase()]
                                && (allPermissions[filterAction.trim().toLowerCase()].isDataAction === isDataAction))) ?
                              `<sup title='Matches permission "${filterAction}"'>[${index + 1}]</sup>` : ''
                          )
                          .join(' ').trim();

                      return (
                        <li key={permissionIndex + 'action' + index} style={permissionsText && permissionsText !== '' ? { fontWeight: 'bold' } : {}}>
                          {roleAction}
                          <span dangerouslySetInnerHTML={{ __html: (permissionsText && permissionsText !== '') ? '&nbsp;&nbsp;' + permissionsText : '' }}></span>
                          {index < permission.actions.length - 1 && <br />}
                        </li>
                      );
                    })}
                    {permission.actions.length === 0 ? <i>(empty)</i> : null}
                  </ul>
                </div>
                <div className='permissions-column-right'>
                  <strong>Excluded control actions:</strong>
                  <ul>
                    {permission.notActions.map((action, index) => (
                      <li key={permissionIndex + 'notAction' + index}>
                        <React.Fragment key={permissionIndex - 'notaction-fragmment-' + index}>
                          {action}
                          {index < permission.notActions.length - 1 && <br />}
                        </React.Fragment>
                      </li>
                    ))}
                    {permission.notActions.length === 0 ? <i>(empty)</i> : null}
                  </ul>
                </div>
              </div>
              <div className="permissions-columns">
                <div className='permissions-column-left'>
                  <strong>Included data actions:</strong>
                  <ul>
                    {
                      permission.dataActions.map((roleAction, index) => {
                        const permissionsText = filters.permissions && filters.permissions.length > 0 &&
                          filters.permissions
                            .map((filterAction, index) =>
                              isPermissionMatch(filterAction, roleAction) ? `<sup title='Matches permission "${filterAction}"'>[${index + 1}]</sup>` : ''
                            )
                            .join(' ').trim();

                        return (
                          <li key={permissionIndex + 'dataAction' + index} style={permissionsText && permissionsText !== '' ? { fontWeight: 'bold' } : {}}>
                            {roleAction}
                            <span dangerouslySetInnerHTML={{ __html: (permissionsText && permissionsText !== '') ? '&nbsp;&nbsp;' + permissionsText : '' }}></span>
                            {index < permission.dataActions.length - 1 && <br />}
                          </li>
                        );
                      })}
                    {permission.dataActions.length === 0 ? <i>(empty)</i> : null}
                  </ul>
                </div>
                <div className='permissions-column-right'>
                  <strong>Excluded data actions:</strong>
                  <ul>
                    {permission.notDataActions.map((action, index) => (
                      <li key={permissionIndex + 'notDataAction' + index}>
                        <React.Fragment key={permissionIndex - 'notDataAction-fragmment-' + index}>
                          {action}
                          {index < permission.notDataActions.length - 1 && <br />}
                        </React.Fragment>
                      </li>
                    ))}
                    {permission.notDataActions.length === 0 ? <i>(empty)</i> : null}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: () => (
        <div>
          Total permissions<br />
          <Select
            mode="multiple"
            style={{ width: '12vw', maxWidth: '190px' }}
            placeholder="Filter"
            optionFilterProp="children"
            onChange={handleFilterPrivilegedChange}
            value={filters.privileged}
          >
            <Option key='false'>Standard role</Option>
            <Option key='true'>Privileged role</Option>
          </Select>
        </div>
      ),
      dataIndex: 'privileged',
      key: 'privileged',
      sorter: false,
      filterMultiple: true,
      onFilter: filterPrivilegedFunction,
      render: (permissions, record) => (
        <div>
          {filterPermissionsFunction('Microsoft.Authorization/roleAssignments/write', record) ? (
            <div title="Microsoft recognizes this role as having privileged permissions.">
              <WarningOutlined style={{ fontSize: '24px', color: '#faad14', marginLeft: '30px' }} />
              <br />
              <strong>Privileged role</strong> <br />
              <p>
                <small>{record.matchingPermissionsTotal} permissions total</small>
              </p>
            </div>
          ) : (
            <>
              Standard role < br />
              <p>
                <small>{record.matchingPermissionsTotal} permissions total</small>
              </p>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'filter-reset',
      title: () => (
        <Button onClick={clearFilters} className='reset-filter-button' type='text' icon={<RedoOutlined />}>Reset filters</Button>
      ),
      // Optional: Adjust the column width as needed
      width: 150,
      // Disable sorting for this "fake" column
      sorter: false,
    },
  ];

  return (
    <Layout>
      <Header>
        <h1>Azure RBAC Least Privilege Calculator </h1>
      </Header>
      <Content>
        <div className='tool-description'>
          <p>
            This tools helps to find a built-in role in Azure that provides the least privilege for a specific set of actions. It is based on the <a href="https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles" target="_blank" rel="noreferrer">built-in roles</a> and <a href="https://docs.microsoft.com/en-us/rest/api/" target='_blank' rel="noreferrer">Azure REST API</a> documentation.
          </p>
          <p>
            Just provide the desired permissions and the tool will show you the roles that provide the least privilege for the given set of actions, with explanation which permission (in filter) matches coresponding allowed permission in role definition.
          </p>
          <p>
            Please be aware that the sorting of the table below is determined by the number of permissions. It does not assess the potential risk associated with each permission, only distinguishing between basic standard and privileged roles. Additionally, note that some permissions are not directly mapped to built-in roles, and some permissions are not allowed in the built-in roles - in such scenario proceed to <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles" target="_blank" rel="noreferrer">create a new Custom role</a>.
          </p>



        </div>
        <Table key='datagrid' columns={columns} dataSource={currentData} onChange={handleChange} pagination={false} rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'} />
      </Content>
      <Footer>
        <p>
          &copy; 2024 <a href="https://www.vjirovsky.cz">Vaclav Jirovsky</a> | <a href="https://blog.vjirovsky.cz">Blog</a>  | <a href="https://github.com/vjirovsky/azure-rbac-least-calculator">GitHub project of the tool</a> | <a href="https://github.com/vjirovsky/azure-rbac-least-calculator/issues">Report an issue</a>
        </p>
        <p>
          Last updated: {lastUpdated}
        </p>
        <p>
          Please note that this is a personal project, it is provided 'as is' with no warranties and confer no rights and is not affiliated with Microsoft Corporation.
        </p>
      </Footer>
    </Layout>
  );
};

export default App;
