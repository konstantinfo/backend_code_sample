<?php

namespace App\Controller\Component;

use Cake\Controller\Component;
use Cake\Core\Configure;

require ROOT . DS . 'vendor' . DS . 'twilio' . DS . 'Services' . DS . 'lib.php';

use Twillo\Twilio;

class TwilioComponent extends Component
{
    /**
     * Default configuration.
     */
    private  $account_sid;
    private  $auth_token;
    private  $client;
    public function __construct()
    {
        if (Configure::read('Twillo.IsLive') == 0) {
            $this->account_sid = Configure::read('Twillo.TestAccountSID');
            $this->auth_token = Configure::read('Twillo.TestDevAuthToken');
            $this->from = Configure::read('Twillo.TestFrom');
        } else {
            $this->account_sid = Configure::read('Twillo.AccountSID');
            $this->auth_token = Configure::read('Twillo.AuthToken');
            $this->from = Configure::read('Twillo.From');
        }
        $this->client = new Twilio($this->account_sid, $this->auth_token);
    }

    /**
     * Send SMS
     */
    public function sendSMS($to, $message)
    {
        $api_res_data = [];
        $api_res_data['api'] = 'Twilio';
        $api_res_data['url'] = 'Twilio';
        $api_res_data['req_type'] = 'post';
        try {
            $response = $this->client->sendSMS($this->from, $to, $message);
            return $response;
        } catch (\Exception $exc) {
            $this->log('Twillo:' . $exc->getMessage());
            return $exc->getMessage();
        }
    }
}
