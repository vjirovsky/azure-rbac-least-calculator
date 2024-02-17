az role definition list --query "[?roleType=='BuiltInRole'].{id:name,roleName:roleName,permissions:permissions,type:type}" > ./build/roles.json

az provider operation list > ./build/permissions.json
