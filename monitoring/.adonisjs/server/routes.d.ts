import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'system.echo': { paramsTuple?: []; params?: {} }
    'adc_protocol.register': { paramsTuple?: []; params?: {} }
    'adc_protocol.heartbeat': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'alarms.acknowledge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adcs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adcs.maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adcs.configure': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.deactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'adcs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'adcs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'system.echo': { paramsTuple?: []; params?: {} }
    'adc_protocol.register': { paramsTuple?: []; params?: {} }
    'adc_protocol.heartbeat': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'alarms.acknowledge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adcs.maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adcs.configure': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.deactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}