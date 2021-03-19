<?php

namespace App\Controller\Component;

require ROOT . DS . 'vendor' . DS . 'docusign' . DS . 'config.php';

use Docusign\Config;
use DocuSign\eSign\Api\AuthenticationApi;
use DocuSign\eSign\Configuration;
use DocuSign\eSign\ApiClient;
use DocuSign\eSign\Api\AuthenticationApi\LoginOptions;
use DocuSign\eSign\Api\EnvelopesApi;
use DocuSign\eSign\Api\EnvelopesApi\GetEnvelopeOptions;
use Cake\Filesystem\File;


/**
 * Docusign component
 */
class DocusignComponent extends Component
{
    /**
     * Login to docusign
     */
    public function login($docusignConfig = array())
    {
        if (!empty($docusignConfig)) {
            $username = $docusignConfig['docusign_username'];
            $password = $docusignConfig['docusign_password'];
            $integratorKey = $docusignConfig['docusign_integrator_key'];
            if (Configure::read('Docusign.IsLive') == 1) {
                $host = Configure::read('Docusign.ApiHostLive');
            } else {
                $host = Configure::read('Docusign.HostDemo');
            }
        } else {
            if (Configure::read('Docusign.IsLive') == 1) {
                $username = Configure::read('Docusign.Username');
                $password = Configure::read('Docusign.Password');
                $integratorKey = Configure::read('Docusign.IntegratorKey');
                $host = Configure::read('Docusign.HostLive');
            } else {
                $username = Configure::read('Docusign.DemoUsername');
                $password = Configure::read('Docusign.DemoPassword');
                $integratorKey = Configure::read('Docusign.DemoIntegratorKey');
                $host = Configure::read('Docusign.HostDemo');
            }
        }
        $loginConfig = new Config($username, $password, $integratorKey, $host);
        $config = new Configuration();
        $config->setHost($loginConfig->getHost());
        $config->setCurlTimeout(120);
        $config->addDefaultHeader("X-DocuSign-Authentication", "{\"Username\":\"" . $loginConfig->getUsername() . "\",\"Password\":\"" . $loginConfig->getPassword() . "\",\"IntegratorKey\":\"" . $loginConfig->getIntegratorKey() . "\"}");

        $loginConfig->setApiClient(new ApiClient($config));


        $authenticationApi = new AuthenticationApi($loginConfig->getApiClient());

        $options = new LoginOptions();
        try {
            $loginInformation = $authenticationApi->login($options);
            if (isset($loginInformation) && count($loginInformation) > 0) {
                $loginAccount = $loginInformation->getLoginAccounts()[0];
                if (isset($loginInformation)) {
                    $accountId = $loginAccount->getAccountId();
                    if (!empty($accountId)) {
                        $loginConfig->setAccountId($accountId);
                    }
                }
            }
        } catch (\Exception $ex) {
            $loginConfig = [];
        }
        return $loginConfig;
    }

    /**
     * Get Envelope Information
     */
    function getEnvelopeInfo($loginConfig, $envelope_id)
    {
        $envelopeApi = new EnvelopesApi($loginConfig->getApiClient());
        $options = new GetEnvelopeOptions();
        $options->setInclude(null);
        $envelop_summary = $envelopeApi->getEnvelope($loginConfig->getAccountId(), $envelope_id);
        return $envelop_summary;
    }

    /**
     * Send Draft Envelope
     */
    function sendDraftEnvelope($loginConfig, $envelope_id)
    {
        $envelopeApi = new EnvelopesApi($loginConfig->getApiClient());
        $options = new GetEnvelopeOptions();
        $options->setInclude(null);
        $response = $envelopeApi->update($loginConfig->getAccountId(), $envelope_id);
        return $response;
    }

    /**
     * Void Envelope
     */
    function voidEnvelope($envelope_id, $reason = null)
    {
        $http = new \Cake\Network\Http\Client();
        if (Configure::read('Docusign.IsLive') == 1) {
            $username = Configure::read('Docusign.Username');
            $password = Configure::read('Docusign.Password');
            $integratorKey = Configure::read('Docusign.IntegratorKey');
            $host = Configure::read('Docusign.HostLive');
        } else {
            $username = Configure::read('Docusign.DemoUsername');
            $password = Configure::read('Docusign.DemoPassword');
            $integratorKey = Configure::read('Docusign.DemoIntegratorKey');
            $host = Configure::read('Docusign.HostDemo');
        }
        $flag = false;
        try {
            $options = array('type' => 'json', 'headers' => ['X-DocuSign-Authentication' => '<DocuSignCredentials><Username>' . $username . '</Username><Password>' . $password . '</Password><IntegratorKey>' . $integratorKey . '</IntegratorKey></DocuSignCredentials>']);
            $url = $host . '/v2/login_information/';
            $response = $http->get($url, array(), $options);
            $dataArr = ['status' => 'voided', 'voidedReason' => $reason];
            $data = json_encode($dataArr);
            $response_data = $response->json;
            if (isset($response_data['loginAccounts'])) {
                $flag = true;
            }
        } catch (\Exception $exc) {
            return $exc->getMessage();
        }
        return $flag;
    }

    /**
     * Download Envelope
     */
    function downloadEnvelope($loginConfig, $envelopeId, $id)
    {
        $envelopeApi = new EnvelopesApi($loginConfig->getApiClient());
        $docsList = $envelopeApi->listDocuments($loginConfig->getAccountId(), $envelopeId);
        $docCount = count($docsList->getEnvelopeDocuments());

        if (Configure::read('Docusign.IsLive') == 1) {
            $username = Configure::read('Docusign.Username');
            $password = Configure::read('Docusign.Password');
            $integratorKey = Configure::read('Docusign.IntegratorKey');
            $host = Configure::read('Docusign.HostLive');
        } else {
            $username = Configure::read('Docusign.DemoUsername');
            $password = Configure::read('Docusign.DemoPassword');
            $integratorKey = Configure::read('Docusign.DemoIntegratorKey');
            $host = Configure::read('Docusign.HostDemo');
        }

        if (intval($docCount) > 0) {
            $this->log(intval($docCount));
            $files = [];
            foreach ($docsList->getEnvelopeDocuments() as $document) {
                if ($document->getName() != 'Summary') {
                    $jsonArr = ["Username" => $username, "Password" => $password, "IntegratorKey" => $integratorKey];
                    $jsonData = json_encode($jsonArr);
                    $curl = curl_init();
                    curl_setopt_array($curl, array(
                        CURLOPT_URL => $host . "/v2/accounts/" . $loginConfig->getAccountId() . "/envelopes/" . $envelopeId . "/documents/" . $document->getDocumentId(),
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_ENCODING => "",
                        CURLOPT_MAXREDIRS => 10,
                        CURLOPT_TIMEOUT => 30,
                        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                        CURLOPT_CUSTOMREQUEST => "GET",
                        CURLOPT_HTTPHEADER => array(
                            "Cache-Control: no-cache",
                            "Content-Type: application/json",
                            "X-DocuSign-Authentication: " . $jsonData
                        ),
                    ));

                    $response = curl_exec($curl);
                    curl_close($curl);
                    new File(WWW_ROOT . "project_files/" . $id . "/" . 'index.html', true, 0777);
                    $fileName = WWW_ROOT . "project_files/" . $id . "/" . $document->getName();
                    file_put_contents($fileName, $response);
                    $files[] = $fileName;
                }
            }
        }
        $completePdf = WWW_ROOT . "project_files/" . $id . "/xxxxxxx.pdf";
        $CakePdf = new \CakePdf\Pdf\CakePdf();
        $CakePdf->mergePDF($files, $completePdf);
        return $completePdf;
    }

    /**
     * Get Envelope Url
     */
    function getEnvelopeUrl($envelope_id)
    {
        $http = new \Cake\Network\Http\Client();
        if (Configure::read('Docusign.IsLive') == 1) {
            $username = Configure::read('Docusign.Username');
            $password = Configure::read('Docusign.Password');
            $integratorKey = Configure::read('Docusign.IntegratorKey');
            $host = Configure::read('Docusign.HostLive');
        } else {
            $username = Configure::read('Docusign.DemoUsername');
            $password = Configure::read('Docusign.DemoPassword');
            $integratorKey = Configure::read('Docusign.DemoIntegratorKey');
            $host = Configure::read('Docusign.HostDemo');
        }
        try {
            $options = array('type' => 'json', 'headers' => ['X-DocuSign-Authentication' => '<DocuSignCredentials><Username>' . $username . '</Username><Password>' . $password . '</Password><IntegratorKey>' . $integratorKey . '</IntegratorKey></DocuSignCredentials>']);
            $url = $host . '/v2/login_information/';

            $response = $http->get($url, array(), $options);
            $response_data = $response->json;
            if (isset($response_data['loginAccounts'])) {
                $baseUrl = $response_data['loginAccounts'][0]['baseUrl'];
                $getReciepentsUrl = $baseUrl . '/envelopes/' . $envelope_id . '/recipients';
                $response_reciepents = $http->get($getReciepentsUrl, array(), $options);
                $response_rec = json_decode($response_reciepents->body, TRUE);
                $response_reciepents_arr = $response_rec['signers'];
                $flag = [];
                /* @var $response_reciepents_arr type */
                $k = 1;
                foreach ($response_reciepents_arr as $key => $val) {
                    $userArr = [];
                    $owner_name = str_replace(' ', '', $val['name']) . $val['email'];

                    if ($val['routingOrder'] == 2) {
                        break;
                    }
                    $userArr['authenticationMethod'] = "email";
                    $userArr['clientUserId'] = $val['clientUserId'];
                    $userArr['email'] = $val['email'];
                    $userArr['returnUrl'] = SITE_FULL_URL . "api/thank-you/" . $envelope_id . '/' . $val['recipientId'];
                    $userArr['userName'] = $val['name'];

                    $envelopeUrl = $baseUrl . '/envelopes/' . $envelope_id . '/views/recipient';
                    $response_last = $http->post($envelopeUrl, json_encode($userArr), $options);
                    $jsonResponse = json_decode($response_last->body);
                    $flag[$owner_name]['url'] = isset($jsonResponse->url) ? $jsonResponse->url : '';
                    $flag[$owner_name]['errorCode'] = isset($jsonResponse->errorCode) ? $jsonResponse->errorCode : '';
                    $flag[$owner_name]['message'] = isset($jsonResponse->message) ? $jsonResponse->message : '';
                    if (isset($val['customFields']['0'])) {
                        $flag[$val['customFields']['0']]['url'] = isset($jsonResponse->url) ? $jsonResponse->url : '';
                        $flag[$val['customFields']['0']]['errorCode'] = isset($jsonResponse->errorCode) ? $jsonResponse->errorCode : '';
                        $flag[$val['customFields']['0']]['message'] = isset($jsonResponse->message) ? $jsonResponse->message : '';
                    }
                    $k++;
                }
            }
        } catch (\Exception $exc) {
            $flag = false;
        }
        return $flag;
    }

    /*
     * Get list of recipients of an envelope
     */
    function getRecipients($envelope_id)
    {
        $http = new \Cake\Network\Http\Client();
        if (Configure::read('Docusign.IsLive') == 1) {
            $username = Configure::read('Docusign.Username');
            $password = Configure::read('Docusign.Password');
            $integratorKey = Configure::read('Docusign.IntegratorKey');
            $host = Configure::read('Docusign.HostLive');
        } else {
            $username = Configure::read('Docusign.DemoUsername');
            $password = Configure::read('Docusign.DemoPassword');
            $integratorKey = Configure::read('Docusign.DemoIntegratorKey');
            $host = Configure::read('Docusign.HostDemo');
        }
        $options = array('type' => 'json', 'headers' => ['X-DocuSign-Authentication' => '<DocuSignCredentials><Username>' . $username . '</Username><Password>' . $password . '</Password><IntegratorKey>' . $integratorKey . '</IntegratorKey></DocuSignCredentials>']);
        $url = $host . '/v2/login_information/';

        $response = $http->get($url, array(), $options);
        $response_data = $response->json;
        if (isset($response_data['loginAccounts'])) {
            $baseUrl = $response_data['loginAccounts'][0]['baseUrl'];
            $getReciepentsUrl = $baseUrl . '/envelopes/' . $envelope_id . '/recipients';
            $response_reciepents = $http->get($getReciepentsUrl, array(), $options);
            $response_rec = json_decode($response_reciepents->body, TRUE);
            $response_reciepents_arr = $response_rec['signers'];
            return $response_reciepents_arr;
        }
        return false;
    }
}
