<?php

namespace App\Controller\Component;

define("SOAP_CLIENT_BASEDIR", ROOT . DS . 'vendor' . DS . 'sfdcclient');
require_once SOAP_CLIENT_BASEDIR . DS . 'SforceEnterpriseClient.php';
require_once SOAP_CLIENT_BASEDIR . DS . 'SforceHeaderOptions.php';

use Cake\Controller\Component;
use Cake\Controller\ComponentRegistry;
use Cake\Core\Configure;
use Cake\ORM\TableRegistry;

/**
 * Salesforce component
 */
class SalesforceComponent extends Component
{

    protected $userName;
    protected $password;
    protected $Flash;

    public function __construct(ComponentRegistry $registry, array $config = [])
    {
        if (Configure::read('SFDC.IsLive') == 1) {
            $this->userName = Configure::read('SFDC.Username');
            $this->password = Configure::read('SFDC.Password') . Configure::read('SFDC.Token');
        } else {
            $this->userName = Configure::read('SFDC.DemoUsername');
            $this->password = Configure::read('SFDC.DemoPassword') . Configure::read('SFDC.DemoToken');
        }
        $this->Flash = $registry->getController()->Flash;
    }

    /**
     * SFDC login
     */
    public function login()
    {
        $sForceConnection = new \SforceEnterpriseClient();
        $sForceConnection->createConnection(SOAP_CLIENT_BASEDIR . '/enterprise.wsdl.xml');
        $sForceConnection->login($this->userName, $this->password);
        return $sForceConnection;
    }

    /**
     * SFDC account data
     */
    function account($data)
    {
        try {
            $login = $this->login();
            $stdObject = json_decode(json_encode($data));
            if (isset($data['Id']) && $data['Id'] != '') {
                $createResponse = $login->update(array($stdObject), 'Account');
            } else {
                $createResponse = $login->create(array($stdObject), 'Account');
            }
            return $this->getResponse($createResponse, $data);
        } catch (\Exception $exc) {
            return ['error' => 1, 'msg' => $exc->getMessage()];
        }
    }

    /**
     * Contact data
     */
    function contact($data)
    {
        try {
            $login = $this->login();
            $stdObject = json_decode(json_encode($data));
            if (isset($data['Id']) && $data['Id'] != '') {
                $createResponse = $login->update(array($stdObject), 'Contact');
            } else {
                $createResponse = $login->create(array($stdObject), 'Contact');
            }
            return $this->getResponse($createResponse, $data);
        } catch (\Exception $exc) {
            return ['error' => 1, 'msg' => $exc->getMessage()];
        }
    }

    /**
     * Create opportunity
     */
    function opportunity($data)
    {
        try {
            $login = $this->login();
            $stdObject = json_decode(json_encode($data));
            if (isset($data['Id']) && $data['Id'] != '') {
                $createResponse = $login->update(array($stdObject), 'Opportunity');
            } else {
                $createResponse = $login->create(array($stdObject), 'Opportunity');
            }
            return $this->getResponse($createResponse, $data);
        } catch (\Exception $exc) {
            return ['error' => 1, 'msg' => $exc->getMessage()];
        }
    }

    /**
     * Sync contact to SFDC
     */
    function contractorSync($id)
    {
        $this->Users = TableRegistry::get('Users');
        if (!empty($this->Users)) {
            $sfdcContact['Role__c'] = '*******';
            $sfdcContact['FirstName'] = $this->Users['first_name'];
            $sfdcContact['LastName'] = $this->Users['last_name'];
            $sfdcContact['Phone'] = $this->Users['phone'];
            $sfdcContact['MobilePhone'] = $this->Users['mobile'];
            $sfdcContact['Email'] = $this->Users['email'];
            $sfdcContact['TEST_ID__c'] = $this->Users['id'];
            if ($this->Users['sfdc_id'] != '') {
                $sfdcContact['Id'] = $this->Users['sfdc_id'];
            }
            $sfdcsfdcContact = $this->contact($sfdcContact);
            if ($sfdcsfdcContact['error'] == 0) {
                $sfdc_id = $sfdcsfdcContact['id'];
                $this->Users->updateAll(['sfdc_id' => $sfdc_id], ['id' => $this->Users['id']]);
            }
        }
    }

    /**
     * Sync contact to Partner
     */
    function syncPartner($id)
    {
        $this->Users = TableRegistry::get('Users');
        $user = $this->Users->findById($id)->first();
        $partner['ID__c'] = $user['id'];
        $partner['Access_Granted__c'] = 1;
        $partner['Name'] = $user['name'];
        $partner['Phone'] = $user['phone'];
        $partner['BillingState'] = 'CA';
        $partner['ShippingState'] = 'CA';
        $partner['Type'] = 'Partner';
        $partner['Company_Name__c'] = $user['company_name'];
        if ($user['sfdc_id'] != '') {
            $partner['Id'] = $user['sfdc_id'];
        }
        $sfdcPartner = $this->account($partner);
        if ($sfdcPartner['error'] == 0) {
            $sfdc_contractor_id = $sfdcPartner['id'];
            $this->Users->updateAll(['sfdc_id' => $sfdc_contractor_id], ['id' => $user['id']]);
        }
    }

    /**
     * Project sync
     */
    function projectSync($id, $type = null)
    {
        $command = 'wget -qO- ' . SITE_FULL_URL . 'sync-project/' . $id . '/' . $type;
        $this->bgExec($command);
    }

    /**
     * Background execute
     */
    function bgExec($command)
    {
        if (substr(php_uname(), 0, 7) == "Windows") {
            pclose(popen("start /B " . $command, "r"));
        } else {
            exec($command . " > /dev/null &");
        }
    }
}
