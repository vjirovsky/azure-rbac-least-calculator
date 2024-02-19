const fs = require('fs').promises; // Use the Promise-based version of the fs module

const inputFile = 'build/roles.json';

// Output filename
const outputFile = 'build/roles-extended.json';

const permissionsFile = 'build/permissions.json';

// Function to process the JSON file
async function processJsonFile() {
  try {
    // Read and parse the input file
    const data = await fs.readFile(inputFile, 'utf8');
    const roles = JSON.parse(data);

    // Read and parse the additional data file
    const permissionsDataContent = await fs.readFile(permissionsFile, 'utf8');
    const allPermissionsObject = JSON.parse(permissionsDataContent);
    const allPermissions = allPermissionsObject.reduce((obj, provider) => {

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
    
    // Check if records is an array
    if (!Array.isArray(roles)) {
      console.error('The file content is not an array.');
      return;
    }

    const processedRoles = roles.map((role, index) => {

      const calculationResult = getTotalTruePermissions(role, allPermissions);
      return { ...role, matchingPermissionsTotal: calculationResult };
    });

    // Save the processed records to the output file
    await fs.writeFile(outputFile, JSON.stringify(processedRoles, null, 2), 'utf8');
    console.log(`Processed data has been saved to '${outputFile}'`);
  } catch (err) {
    console.error('Error processing the files:', err);
  }
}

const getTotalTruePermissions = (record, allPermissions) => {
  return Object.keys(allPermissions).reduce((total, permissionKey) => {
    const permissionValue = allPermissions[permissionKey];

    if (filterPermissionsFunction(permissionValue.name, record, allPermissions)) {
      total += 1;
    }
    return total;
  }, 0);
}

const filterPermissionsFunction = (value, record, allPermissions) => {
  
  var action = value.trim();

  var roleDefinition = record.permissions[0];
  console.log('Testing '+ value +' for record ' + roleDefinition.name);
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
};

// Helper function to check if an action matches a pattern
const matches = (action, pattern) => {
  const regex = new RegExp('^' + pattern.split('*').join('.*') + '$');
  return regex.test(action);
};


const isPermissionMatchForRoleSet = (action, roleDefinitionActions) => {
  // Check if the action is explicitly allowed
  return roleDefinitionActions.some(pattern => matches(action, pattern));
}

// Call the function
processJsonFile();