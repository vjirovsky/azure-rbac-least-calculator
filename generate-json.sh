az role definition list --query "[?roleType=='BuiltInRole'].{id:name,roleName:roleName,permissions:permissions,type:type} | Out-File ./public/roles.json

az provider operation list > ./public/permissions.json