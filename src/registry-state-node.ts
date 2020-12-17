import _ from 'the-lodash';
import { Alert, AlertCounter, ItemProperties, RegistryState, SnapshotNodeConfig } from './registry-state';

export class RegistryStateNode
{
    private _state : RegistryState;
    private _dn : string;
    private _config: SnapshotNodeConfig;
    private _propertiesMap: ItemProperties;
    private _selfAlerts: Alert[];
    private _markers: Record<string, boolean> = {};

    constructor(state: RegistryState, dn: string, config: SnapshotNodeConfig, propertiesMap: ItemProperties, alerts: Alert[])
    {
        this._state = state;
        this._dn = dn;
        this._config = config;
        this._propertiesMap = propertiesMap;
        this._selfAlerts = alerts;
    }

    get dn() {
        return this._dn;
    }

    get kind() {
        return this.config.kind;
    }

    get config(): SnapshotNodeConfig {
        return this._config;
    }

    get childrenCount() : number {
        var childDns = this._state.getChildrenDns(this.dn);
        return childDns.length;
    }

    get labels(): any {
        return this._propertiesMap['labels'] || {};
    }

    get annotations(): any {
        return this._propertiesMap['annotations'] || {};
    }

    get selfAlerts() : Alert[] {
        return this._selfAlerts;
    }

    get markers() : string[] {
        return _.keys(this._markers);
    }

    get markersDict()  {
        return this._markers;
    }

    get propertiesMap() {
        return this._propertiesMap;
    }

    getProperties(name: string) : any
    {
        const props = this._propertiesMap[name];
        if (!props) {
            return {};
        }
        return props;
    }

    raiseMarker(name: string)
    {
        this._markers[name] = true;
    }

}

