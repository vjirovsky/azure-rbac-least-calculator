az provider operation list > ./public/permissions.json
az role definition list --query "[?roleType=='BuiltInRole'].{id:name,roleName:roleName,permissions:permissions,type:type}" > ./public/roles.json
