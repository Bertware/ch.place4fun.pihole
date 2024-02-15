const Homey = require('homey');
const PiholeDevice = require('./device'); // Stellen Sie sicher, dass der Pfad korrekt ist.
const CAPABILITY_DEBOUNCE = 500;


class PiHoleDevice extends Homey.Device {

    async onInit() {

      this.log('PiHole Control: Gerät wurde initialisiert');

      //Ansprechen der Einstellungen, damit Zugriff darauf gewähleistet ist
      const deviceSettings = this.getSettings();
             
      //Die nötigen Einstellungen holen und bereitstellen
      const device_url = deviceSettings.url
      const device_port = deviceSettings.port
      const device_api = deviceSettings.api
   
      //Schreiben ins Log File
      this.log('PiHole Control: URL  ->', device_url);
      this.log('PiHole Control: Port ->', device_port);
      this.log('PiHole Control: Key  ->', device_api);
  
      //Herausfinden welches Gerät das ist
      this.log('PiHole Control: Identifiziert und initialisiert ..')
     
      //Bereitstellen der nötigen URLs für Aktionen / Abfragen
      const disable_url = `${device_url}:${device_port}/admin/api.php?disable&auth=${device_api}`;
      const enable_url = `${device_url}:${device_port}/admin/api.php?enable&auth=${device_api}`;
      const status_url = `${device_url}:${device_port}/admin/api.php?summaryRaw&auth=${device_api}`;
  
      //Schreiben ins Log File
      this.log('PiHole Control: URL Disable ->', disable_url);
      this.log('PiHole Control: URL Enable ->', enable_url);
      this.log('PiHole Control: URL Status ->', status_url);

      //Capabilities Updaten (Danke Ronny Winkler)
      await this._updateCapabilities();

      //Capabilities Listener
       this.registerMultipleCapabilityListener(this.getCapabilities(), async (capabilityValues, capabilityOptions) => {
        // try{
            await this._onCapability( capabilityValues, capabilityOptions);
        // }
        // catch(error){
        //     this.log("_onCapability() Error: ",error);
        // }
      },CAPABILITY_DEBOUNCE);

      let deviceSettingsArray = [
        {
          url: device_url,
          port: device_port,
          api: device_api
        },
      ]; // Angenommen, dies ist bereits mit den Geräteeinstellungen gefüllt
      let intervalIds = new Map(); // Zum Speichern der intervalId für jedes Gerät
      
      deviceSettingsArray.forEach(deviceSettings => {
        const status_url = `${device_url}:${device_port}/admin/api.php?summaryRaw&auth=${device_api}`;
      
        // Erstellen des wiederkehrenden Tasks
        const intervalId = setInterval(() => {
          this._updateDeviceData(status_url);
        }, 60000); // alle 60 Sekunden
      
        // Speichern der intervalId mit der Geräte-ID als Schlüssel
        intervalIds.set(deviceSettings.id, intervalId);
      });

      //Schreibt den Status, bei Veränderung, ins Log File
      this.registerCapabilityListener('onoff', async (value) => {
      this.log('PiHole Control: Eingeschaltet:' ,value);
      const deviceId = this.getData().id;
  
      //Reagiert darauf, wenn das Gerät nicht erreichbar ist
      this.setUnavailable(this.homey.__('device.unavailable')).catch(this.error);

      if (value) {
        this.log('PiHole Control: Eingeschaltet:' ,value);
        this._makeAPICall(enable_url)
      } else {
        this.log('PiHole Control: Ausgeschaltet:' ,value);
        this._makeAPICall(disable_url)
      }
      }
    )
  }

 /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
 async onAdded() {
  this.log('PiHole Control: Gerät wurde hinzugefügt' ,value);
}

/**
 * onSettings is called when the user updates the device's settings.
 * @param {object} event the onSettings event data
 * @param {object} event.oldSettings The old settings object
 * @param {object} event.newSettings The new settings object
 * @param {string[]} event.changedKeys An array of keys changed since the previous version
 * @returns {Promise<string|void>} return a custom message that will be displayed
 */
async onSettings({ oldSettings, newSettings, changedKeys }) {
  this.log(`PiHole Control: [Device] ${this.getName()}: Einstellung geändert: ${changedKeys}`);
  this._settings = newSettings;
}

/**
 * onRenamed is called when the user updates the device's name.
 * This method can be used this to synchronise the name to the device.
 * @param {string} name The new name
 */
async onRenamed(name) {
  this.log('PiHole Control: Gerät wurde umbenannt' ,value);
}

/**
 * onDeleted is called when the user deleted the device.
 */
async onDeleted() {
  this.log('PiHole Control: Gerät wurde gelöscht' ,value);
  //clearInterval(this.homeyApp.DeviceUpdateTask); // stoppe das Intervall, wenn das Gerät gelöscht wird

 // Finde das Gerät mit der gegebenen ID
 const device = deviceSettingsArray.find(d => d.id === deviceId);
  
  // Überprüfe, ob eine intervalId für das Gerät existiert
  if (intervalIds.has(deviceId)) {
    // Hole die intervalId und stoppe das Intervall
    clearInterval(intervalIds.get(deviceId));
    console.log(`Task für Gerät ${deviceId} gestoppt.`);

    // Entferne die intervalId aus der Map
    intervalIds.delete(deviceId);
  } else {
    console.log(`Kein Task gefunden für Gerät ${deviceId}.`);
  }

}

async _updateCapabilities(){
  let capabilities = [];
  try{
    capabilities = this.homey.app.manifest.drivers.filter((e) => {return (e.id == this.driver.id);})[0].capabilities;
    // remove capabilities
    let deviceCapabilities = this.getCapabilities();
    for (let i=0; i<deviceCapabilities.length; i++){
      let filter = capabilities.filter((e) => {return (e == deviceCapabilities[i]);});
      if (filter.length == 0 ){
        try{
          await this.removeCapability(deviceCapabilities[i]);
        }
        catch(error){}
      }
    }
    // add missing capabilities
    for (let i=0; i<capabilities.length; i++){
      if (!this.hasCapability(capabilities[i])){
        try{
          await this.addCapability(capabilities[i]);
        }
        catch(error){}
      }
    }
  }
  catch (error){
    this.error(error.message);
  }
}

// CAPABILITIES =======================================================================================

async _onCapability( capabilityValues, capabilityOptions){

  //Ansprechen der Einstellungen, damit Zugriff darauf gewähleistet ist
  const deviceSettings = this.getSettings();
             
  //Die nötigen Einstellungen holen und bereitstellen
  const device_url = deviceSettings.url
  const device_port = deviceSettings.port
  const device_api = deviceSettings.api

  //Schreiben ins Log File
  this.log('PiHole Control: URL ->', device_url);
  this.log('PiHole Control: Port ->', device_port);
  this.log('PiHole Control: Key ->', device_api);

  //Herausfinden welches Gerät das ist
  this.log('PiHole Control: ', deviceSettings.name, deviceSettings.id, ': Identifiziert und initialisiert ..')
 
  //Bereitstellen der nötigen URLs für Aktionen / Abfragen
  const status_url = `${device_url}:${device_port}/admin/api.php?summaryRaw&auth=${device_api}`;

  if( capabilityValues["data_refresh"] != undefined){
    this.log('PiHole Control: Manueller Refresh gestartet');
    this._updateDeviceData(status_url);
 }
}

// Helpers =======================================================================================
async _makeAPICall(url) {

    try {
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      this.log('PiHole Control: API Aufruf erfolgreich');
      return { success: true }; // Erfolgsstatus zurückgeben
  
    } catch (error) {
      this.log('PiHole Control: API Aufruf fehlgeschlagen:');
      this.log(errorMessage);
      return { success: false, errorMessage: error.message }; // Fehlerstatus und Fehlermeldung zurückgeben
    }
}


async _updateDeviceData(url) {

  try {
    const response = await fetch(url);
    // Überprüft, ob der Statuscode im Erfolgsbereich liegt (200-299) oder 403 ist
    if (!response.ok && response.status !== 403) { 
        throw new Error(`PiHole Control: Status Filter: ${response.status}`);
    } else {
    }

    const data = await response.json();
  
  fetch(url).then(response => response.json())
  .then(data => {

    //Saubere Formatierung des Status   
      let PiHoleState = false

      if(data.status === 'enabled') {
        PiHoleState = false
      } else {
        PiHoleState = true
      }
       //Datum sauber formatieren
      let syncDate = new Date();
      let day = syncDate.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit', 
        timeZone: this.homey.clock.getTimezone() 
      });
      let time = syncDate.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: this.homey.clock.getTimezone()
      });

      // Datum und Uhrzeit zusammenführen
      let formattedSyncDate = `${time} | ${day}`;

      //DNS Anfragen pro Tag
      let dns_queries_today = data.dns_queries_today;
      let formatted_dns_queries_today = dns_queries_today.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'");
      
      //Geblockte ADDs pro Tag
      let blocked_adds_today = data.ads_blocked_today;
      let formatted_blocked_adds_today = blocked_adds_today.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'");

      //Geblockte ADD pro Tag in %
      let blocked_adds_today_percent = data.ads_percentage_today;
      let formated_blocked_adds_today_percent = blocked_adds_today_percent.toFixed(1) + " %"
      
      //Letztes Update der Gravity Datenbank
      let gravity_update_days = data.gravity_last_updated.relative.days;
      let gravity_update_hours = data.gravity_last_updated.relative.hours;
      let gravity_update_minutes = data.gravity_last_updated.relative.minutes;

      //let gravity_update_minutes = data.gravity_last_updated.relative.minutes;
      let gravity_update_string = gravity_update_days + ' Tg. ' + gravity_update_hours +' Std. ' + gravity_update_minutes + ' Min.';        
      
      // Loggen der Werte zwecks Diagnose
      this.log('');
      this.log('PiHole Control: *******************************************************');
      this.log('PiHole Control: Task Geräte Abgleich: GESTARTET');
      this.log('PiHole Control: Status Filter:' , data.status);
      this.log('PiHole Control: DNS Querys pro Tag:' , formatted_dns_queries_today);
      this.log('PiHole Control: Werbeanzeigen geblockt:' , formatted_blocked_adds_today);
      this.log('PiHole Control: Werbeanzeigen geblockt in Prozent:' , formated_blocked_adds_today_percent);
      this.log('PiHole Control: Letzter Gravity Update:' ,gravity_update_string);
      this.log('PiHole Control: Letzter Sync' , formattedSyncDate);
      this.log('PiHole Control: Task Geräte Abgleich: BEENDET');
      this.log('PiHole Control: *******************************************************');
      this.log('');

      // Jetzt können Sie Capabilities für dieses Gerät setzen
      this.setCapabilityValue('alarm_communication_error', false);
      this.setCapabilityValue('alarm_filter_state', PiHoleState);
      this.setCapabilityValue('measure_dns_queries_today', dns_queries_today);
      this.setCapabilityValue('measure_ads_blocked_today', blocked_adds_today);
      this.setCapabilityValue('last_sync', formattedSyncDate);
      this.setCapabilityValue('measure_ads_blocked_today_percent', blocked_adds_today_percent);
      this.setCapabilityValue('gravity_last_update', gravity_update_string);
});
} catch (error) {
  this.log('PiHole Control: Ein Fehler ist aufgetreten ->', error.message);
  
  // Jetzt können Sie Capabilities für dieses Gerät setzen
  this.setCapabilityValue('alarm_communication_error', true); 
}
} 
}
module.exports = PiHoleDevice;