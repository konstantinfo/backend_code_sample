<?php

namespace App\Controller\Component;

use Cake\Controller\Component;
use \Firebase\JWT\JWT;

class BoxComponent extends Component
{

    public $components = [];
    public $authorizeUrl = 'https://account.box.com/api/oauth2/authorize';
    public $tokenUrl = 'https://api.box.com/oauth2/token';
    public $apiUrl = 'https://api.box.com/2.0';
    public $uploadUrl = 'https://upload.box.com/api/2.0';
    public $accessToken;
    public $filename;
    public $passPhrase;
    public $clientId;
    public $clientSecret;
    public $accessType;
    public $accessTypeId;
    public $publicKeyId;

    /**
     * Login to box account to get access token
     */
    public function login($filename, $passPhrase, $clientId, $clientSecret, $accessType = "enterprise", $accessTypeId, $publicKeyId)
    {
        $this->filename = $filename;
        $this->passPhrase = $passPhrase;
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->accessType = $accessType;
        $this->accessTypeId = $accessTypeId;
        $this->publicKeyId = $publicKeyId;
        self::getAccessToken();
    }

    /**
     * Get AccessToken by JWT
     */
    public function getAccessToken()
    {
        $private_key_file = $this->filename;
        $fp = fopen($private_key_file, "r");
        if (!$fp) {
            die("Unable to open file");
        }

        $raw_key_data = fread($fp, filesize($private_key_file));
        fclose($fp);

        $privateKey = openssl_get_privatekey($raw_key_data, $this->passPhrase);

        define("FIREBASE_PRIVATE_KEY", $privateKey);
        $token = array(
            "iss" => $this->clientId,
            "aud" => "https://api.box.com/oauth2/token",
            "jti" => sprintf(
                '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0xffff)
            ),
            "exp" => time() + 30,
            "sub" => $this->accessTypeId,
            "box_sub_type" => $this->accessType
        );

        $jwt = JWT::encode($token, FIREBASE_PRIVATE_KEY, 'RS256', $this->publicKeyId);
        $params = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&client_id=' . $this->clientId . '&client_secret=' . $this->clientSecret . '&assertion=' . $jwt;
        $token = json_decode(self::httpClient("POST", $this->tokenUrl, $params), true);
        $this->accessToken = $token["access_token"];
    }

    /**
     * Sets the required before biulding the query
     */
    private function setOpts(array $opts)
    {
        if (!array_key_exists('access_token', $opts)) {
            $opts['access_token'] = $this->accessToken;
        }
        return $opts;
    }

    /**
     * Builds the URL for the call
     */
    private function buildUrl($api_func, array $opts = array(), $url = null)
    {
        $opts = $this->setOpts($opts);
        if (isset($url)) {
            $base = $url . $api_func . '?';
        } else {
            $base = $this->apiUrl . $api_func . '?';
        }
        $query_string = http_build_query($opts);
        $base = $base . $query_string;
        return $base;
    }

    /**
     * Uploads file
     */
    public function putFile($filename, $parent_id)
    {
        $file = defined('PHP_MAJOR_VERSION') && PHP_MAJOR_VERSION >= 5 ? new \CurlFile(realpath($filename)) : '@/' . realpath($filename);

        $url = $this->buildUrl('/files/content', array(), $this->uploadUrl);
        $params = array('filename' => $file, 'name' => basename($filename), 'parent_id' => $parent_id, 'access_token' => $this->accessToken);
        return json_decode($this->httpClient("post", $url, $params), true);
    }

    /**
     * Create new folder
     */
    public function createFolder($name, $parent_id)
    {
        $url = $this->buildUrl("/folders");
        $params = array('name' => $name, 'parent' => array('id' => $parent_id));
        return json_decode($this->httpClient("post", $url, json_encode($params)), true);
    }

    /**
     * Modifies the folder details as per the API
     */
    public function updateFolder($folder, array $params)
    {
        $url = $this->buildUrl("/folders/$folder");
        return json_decode($this->httpClient("put", $url, $params), true);
    }

    /**
     * Share folder
     */
    public function shareFolder($folder, array $params)
    {
        $url = $this->buildUrl("/folders/$folder");
        print_r();
        return json_decode($this->httpClient("put", $url, $params), true);
    }

    /**
     * Share file
     */
    public function shareFile($file, array $params)
    {
        $url = $this->buildUrl("/files/$file");
        return json_decode($this->httpClient("put", $url, $params), true);
    }

    /**
     * Curl API Call
     */
    private static function httpClient($method, $url, $params = null)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        if (strcasecmp($method, "POST") == 0) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        } elseif (strcasecmp($method, "PUT") == 0) {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
        } elseif (strcasecmp($method, "DELETE") == 0) {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
        }
        $data = curl_exec($ch);
        curl_close($ch);
        return $data;
    }
}
