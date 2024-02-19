az provider operation list > ./build/permissions.json
az role definition list --query "[?roleType=='BuiltInRole'].{id:name,roleName:roleName,permissions:permissions,type:type}" > ./build/roles.json

node extend-roles-data.js
