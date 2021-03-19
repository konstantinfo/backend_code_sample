"""
function used to pull gateways and devices data from the machineq APIs
and save formatted data in mysql database
"""
def callAPI_with_OAUTH(api_url, token_url, entity_type):
         token = loginOAUTHApplication(api_url, token_url)
         if entity_type == 'device' or entity_type is None:
            data = getDevices(api_url, headers, token)
            if 'Devices' in data:
               items = data['Devices']
               for item in items:
                  cursor.execute(check_device, {'DevEUI':item['DevEUI']})
                  row = cursor.fetchone()
                  if row is not None:
                     data_device = {
                        'name': item['Name'],
                        'health_state': item['Statistics']['HealthState'],
                        'battery_level': item['Statistics']['BatteryLevel'],
                        'last_signal': item['LastUplink'],
                        'updated_at': item['UpdatedAt'],
                        'id': row[0]
                     }
                     cursor.execute(update_device, data_device)
                  else:
                     data_device = (item['Name'],item['DevEUI'],item['Statistics']['HealthState'],
                        item['Statistics']['BatteryLevel'], item['CreatedAt'], item['UpdatedAt'], item['LastUplink'])
                     cursor.execute(add_device, data_device)
                  
                  conn.commit()
               print('device import done')
           
         if entity_type == 'gateway' or entity_type is None:
            data = getGateways(api_url, headers, token)
            if 'Gateways' in data:
               items = data['Gateways']
               for item in items:
                  cursor.execute(check_gateway, {'machineq_id':item['Id']})
                  row = cursor.fetchone()
                  connection_state = "Connected" if item['Statistics']['ConnectionState'] == 'CNX' else "Disconnected"
                  health_state = "ACTIVE" if item['Statistics']['HealthState'] == 'ACTIVE' else "Unknown"
                  ethernet_status = None
                  gprs_status = None
                  if item['Statistics']['InterfaceStatistics'] is not None:
                     for interfaceStat in item['Statistics']['InterfaceStatistics']:
                        if interfaceStat['Type'] == 'GPRS':
                           gprs_status = interfaceStat['State']
                        if interfaceStat['Type'] == 'ETHERNET':
                           ethernet_status = interfaceStat['State']

                  if row is not None:
                     data_gateway = {
                        'name': item['Name'],
                        'connection_state': connection_state,
                        'health_state': health_state,
                        'last_signal': item['Statistics']['LastReportingTime'],
                        'updated_at': item['UpdatedAt'],
                        'ethernet_status': ethernet_status,
                        'gprs_status': gprs_status,
                        'id': row[0]
                     }
                     cursor.execute(update_gateway, data_gateway)
                  else:
                     mac_address = item['MacAddress'].split(':')[2:]
                     gateway_id = ''.join(mac_address)
                     data_gateway = (item['Name'], item['Id'], item['MacAddress'], connection_state, health_state, 
                     item['NodeId'], gateway_id, item['CreatedAt'], item['UpdatedAt'], item['Statistics']['LastReportingTime'],
                     ethernet_status, gprs_status)
                     cursor.execute(add_gateway, data_gateway)
               
                  conn.commit()
               print('gateway import done')

# lambda function trigger hourly
def lambda_handler(event, context):
   print('started')
   global cursor
   if cursor is None:
      cursor = conn.cursor()
   callAPI_with_OAUTH(api_url, token_url, None)
   cursor.close()
   return {
      'statusCode': 200
   }