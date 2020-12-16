import { RegistryBundleState } from "./registry-bundle-state";
import { Alert, AlertCounter, SnapshotNodeConfig } from "./registry-state";
import { RegistryStateNode } from "./registry-state-node";

export class RegistryBundleNode
{
    private _bundle : RegistryBundleState;
    private _node: RegistryStateNode;
    private _selfAlertCount: AlertCounter = { error: 0, warn: 0 };
    private _alertCount: AlertCounter = { error: 0, warn: 0 };
    private _hierarchyAlerts : Record<string, Alert[]> = {};

    constructor(bundle : RegistryBundleState, node: RegistryStateNode)
    {
        this._bundle = bundle;
        this._node = node;
    }

    get kind() {
        return this._node.kind;
    }

    get dn() {
        return this._node.dn;
    }

    get config() : SnapshotNodeConfig {
        return this._bundle.getNode(this.dn)!;
    }

    get registryNode() {
        return this._node;
    }

    get selfAlerts() {
        return this._node.selfAlerts;
    }

    get selfAlertCount() {
        return this._selfAlertCount;
    }

    get alertCount() {
        return this._alertCount;
    }

    get propertiesMap() {
        return this.registryNode.propertiesMap;
    }

    get hierarchyAlerts() {
        return this._hierarchyAlerts
    }
}