import _ from 'the-lodash';
import { ItemProperties, RegistryState } from './registry-state';
import { Alert, SnapshotNodeConfig, SnapshotPropsConfig  } from './snapshot/types';

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

    get rn() {
        return this.config.rn;
    }

    get name() {
        return this.config.name;
    }

    get config(): SnapshotNodeConfig {
        return this._config;
    }

    get childrenCount() : number {
        var childDns = this._state.getChildrenDns(this.dn);
        return childDns.length;
    }

    get labels(): SnapshotPropsConfig {
        return this._propertiesMap['labels'] || {};
    }

    get annotations(): SnapshotPropsConfig {
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

    getProperties(name: string) : SnapshotPropsConfig | null
    {
        const props = this._propertiesMap[name];
        if (!props) {
            return null;
        }
        return props;
    }

    getPropertiesConfig(name: string) : any
    {
        const props = this._propertiesMap[name];
        if (!props) {
            return {};
        }
        return props.config || {};
    }

    raiseMarker(name: string)
    {
        this._markers[name] = true;
    }

}

