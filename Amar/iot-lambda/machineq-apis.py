import requests
import json

# api health check function 
def getAPIVersion(api_url):
    verUrl = api_url + "/version"
    r = requests.get(verUrl)
    if r.status_code == requests.codes.ok:
        rj = r.json()
        print("API Version response json {rj}".format(rj=rj))
        return rj
    else:
        ## /version wasn't implemented before 1.0.0, set it to 0.4.0
        print("API Version call failed with code {code}, reason {reason}".format(verUrl=verUrl, code=r.status_code, reason=r.reason))
        return {'Semantic': '0.4.0', 'Major': '0', 'Minor': '4', 'Patch': '0'}

# function used to get device data from apis
def getDevices(api_url, headers, token, pretty=False):
    return getAPICall(api_url + "/devices", headers, token, pretty)

# function used to get gateways data from apis
def getGateways(api_url, headers, token, pretty=False):
    return getAPICall(api_url + "/gateways", headers, token, pretty)

# function used to get client account data from apis
def getAccount(api_url, headers, token, pretty=False):
    return getAPICall(api_url + "/account", headers, token, pretty)

# common function to call apis
def getAPICall(finalurl, headers, token, pretty=False):
    print("calling get url : {finalurl}".format(finalurl=finalurl))
    headers['Authorization'] = token
    print("headers: {headers}".format(headers=headers))
    r = requests.get(finalurl, headers = headers)
    if r.status_code == requests.codes.ok:
        rj = r.json()
        return rj
    else:
        print("finalurl failed with code {code}, reason {reason}".format(finalurl=finalurl, code=r.status_code, reason=r.reason))
        return {}