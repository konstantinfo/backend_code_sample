/*
* lambda function used to decode hexadecimal string
* hexadecimal string having water meter data which is converted into byte format
* and save into mysql database
*/

exports.handler = async (event, context) => {
    try{
        const byteArr = bytesFromHexString(event.payload_hex);
        const payload = Decoder(byteArr);
        const Time = dateformat(event.Time, "yyyy-mm-dd HH:MM:ss");
        const INSERT_QUERY = '';
        
        const UPDATE_DEVICE= 'UPDATE devices set gateway_id=?,cumulative_flow=?, instantaneous_flow=?, battery_voltage=? WHERE DevEUI=?'
        const params = [
            event.GatewayID, event.DevEUI, event.DevAddr, event.payload_hex, Time,
            payload.cumulativeflow, payload.instantaneousflow, payload.valveStatus,
            payload.batteryVoltage, payload.waterpipeBurst, payload.leakageFault,
            payload.temperatureSensor, payload.lowSensor, payload.tubeLocation, payload.openValve,
            payload.closeValve, payload.externalPowerSupply, payload.openValveFault, 
            payload.closeValveFault, payload.forcedOpenValve, payload.forcedCloseValve,
            payload.backupPowerSupply, payload.meterReadingTime,'payload'
        ]

        const update_params = [event.GatewayID, payload.cumulativeflow, payload.instantaneousflow, payload.batteryVoltage, event.DevEUI];
        
        let results = await mysql.query(INSERT_QUERY, params);
        let update_result = await mysql.query(UPDATE_DEVICE, update_params);
        await mysql.end()
        return {
            status: 'success',
            data: results
        };
    } catch(e){
        await mysql.end()
        console.log('decoder err ', e.message)
        return {
            status: 'error',
            error: e.message
        };
    }
}