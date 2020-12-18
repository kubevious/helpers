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

    private _markers: Record<string, boolean>;
    private _labels : Record<string, string>;
    private _annotations : Record<string, string>;

    constructor(bundle: RegistryBundleState, node: RegistryStateNode)
    {
        this._bundle = bundle;
        this._node = node;

        this._markers = node.markersDict;
        this._labels = node.getPropertiesConfig('labels');
        this._annotations = node.getPropertiesConfig('annotations');
    }

    get kind() : string {
        return this._node.kind;
    }

    get dn() : string {
        return this._node.dn;
    }

    get config() : SnapshotNodeConfig {
        return this._bundle.getNode(this.dn)!;
    }

    get registryNode() {
        return this._node;
    }

    get selfAlerts() : Alert[] {
        return this._node.selfAlerts;
    }

    get selfAlertCount() : AlertCounter {
        return this._selfAlertCount;
    }

    get alertCount() : AlertCounter {
        return this._alertCount;
    }

    get propertiesMap() : Record<string, any> {
        return this.registryNode.propertiesMap;
    }

    get hierarchyAlerts() : Record<string, Alert[]> {
        return this._hierarchyAlerts
    }

    get labels() : Record<string, string> {
        return this._labels;
    }

    get annotations() : Record<string, string> {
        return this._annotations;
    }

    get markers() : Record<string, boolean> {
        return this._markers;
    }
}