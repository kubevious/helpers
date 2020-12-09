export const PROPERTY_GROUP_TOOLTIPS : Record<string, any> = {
    'properties': 'Top level properties associated with this object.',

    'config': 'Kubernetes YAML Configuration',

    'labels': 'Kubernetes Labels',
    'annotations': 'Kubernetes Annotations',

    'env': 'Environment variables applied to this container. Also contains variables defined in related ConfigMaps.',

    'resources': {
        owner: {
            ns: 'Resource usage for all pod replicas within the namespace.', 
            app: 'Resource usage for all pod replicas witing the application.',
            cont: 'Resource usage for a single container.',
            node: 'Resources provided by this node.'
        },
        default: 'Resource usage.'
    },
    'resources-per-pod': 'Resource usage per single pod.',
    'cluster-consumption': 'Consumption of overall cluster resources.',
    'cluster-resources': 'Resources provided by all nodes within the cluster.',
    'node-resources': 'Resources provided by a single node. Describes the weakest node in the cluster.',
    'app-consumption': 'List of apps and resources they consume. Apps that tame most resources are on the top.',

    'shared-with': 'Other objects that also use this configuration.',

    'ingress-app': 'Ingress network policy rules that allow or deny traffic from other applications.',
    'ingress-cird': 'Ingress network policy rules that allow or deny traffic from CIDR blocks.',
    'egress-app': 'Egress network policy rules that allow or deny traffic to other applications.',
    'egress-cird': 'Egress network policy rules that allow or deny traffic to CIDR blocks.',
}