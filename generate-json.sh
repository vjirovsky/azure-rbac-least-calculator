#!/bin/bash

az provider operation list > ./build/permissions.json
az role definition list --query "[?roleType=='BuiltInRole'].{id:name,roleName:roleName,permissions:permissions,type:type}" > ./build/roles.json

echo 'Files './build/permissions.json' and './build/roles.json'  generated successfully!'
