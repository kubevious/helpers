module.exports = {
    "radioactive": "<strong>Radiactive</strong>. This object, or its descendents are using excessive permissions like priviledged containers, host network, etc. See <strong>\"Radiactivity\"</strong> properties on affected <strong>Containers</strong> and <strong>Launchers</strong>.",
    "xnamespace": "<strong>Spy</strong>. This object, or its descendents have access to Kubernetes APIs beyond the namespace. See <strong>\"Resource Role Matrix\"</strong> properties on affected <strong>Service Accounts</strong> and <strong>Role Bindings</strong>.",
    "shared": "<strong>Shared</strong>. This object is shared and any changes would cascadate to dependents. See <strong>\"Shared With\"</strong> properties for list of dependents.",
};
