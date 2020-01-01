public with sharing class AuthorizeSync {

private string APIkey = '95BzU29es';
private string transKey = '9k92sF6ABtbG46xc';
private string Amt = '5';
private string cardNum = '4007000000027';
private string expdate = '1220';
private string cvvCode = '999';

//Method to make payment and charge the card
public void makePayment(){
//Getting access token from Paypal
HttpRequest req1 = new HttpRequest();
req1.setMethod('POST');
req1.setEndpoint('https://apitest.authorize.net/xml/v1/request.api');
req1.setHeader('content-type', 'application/json');
/*
Production URL: https://api.authorize.net/xml/v1/request.api

XSD URL: https://api.authorize.net/xml/v1/schema/AnetApiSchema.xsd
*/

string messageBody1 ='{"createTransactionRequest":{"merchantAuthentication":{"name":"'+APIkey+'","transactionKey":"'+transKey+'"},'
+'"refId":"123456","transactionRequest":{"transactionType":"authCaptureTransaction","amount":"'+Amt+'","payment":{"creditCard":'
+'{"cardNumber":"'+cardNum+'","expirationDate":"'+expdate+'","cardCode":"'+cvvCode+'"}},"lineItems":{"lineItem":{"itemId":"1","name":"vase",'
+'"description":"Cannes logo","quantity":"18","unitPrice":"45.00"}},"tax":{"amount":"4.26","name":"level2 tax name","description":"level2 tax"},'
+'"duty":{"amount":"8.55","name":"duty name","description":"duty description"},"shipping":{"amount":"4.26","name":"level2 tax name",'+
'"description":"level2 tax"},"poNumber":"456654","customer":{"id":"99999456654"},"billTo":{"firstName":"Trail","lastName":"Head",'+
'"company":"Souveniropolis","address":"14 Main Street","city":"Pecan Springs","state":"TX","zip":"44628","country":"USA"},"shipTo":'+
'{"firstName":"China","lastName":"Bayles","company":"Thyme for Tea","address":"12 Main Street","city":"Pecan Springs","state":"TX","zip":"44628",'+
'"country":"USA"},"customerIP":"192.168.1.1","transactionSettings":{"setting":{"settingName":"testRequest","settingValue":"false"}},'+
'"userFields":{"userField":[{"name":"MerchantDefinedFieldName1","value":"MerchantDefinedFieldValue1"},{"name":"favorite_color","value":"blue"}]}}}}';

req1.setHeader('Content-length', String.valueOf(messageBody1.length()));
req1.setBody(messageBody1);

req1.setTimeout(60*1000);
Http h1 = new Http();
String resp1;
HttpResponse res1 = h1.send(req1);
resp1 = res1.getBody();
Map<String,object> responseMap =(Map<String,object>)JSON.deserializeUntyped(res1.getBody().substring(1,res1.getBody().length())) ;
for(string keyStr : responseMap.keyset())
system.debug(keyStr+'———–Response——————>>>>'+responseMap.get(keyStr));
ApexPages.addmessage(new ApexPages.message(ApexPages.severity.Confirm, resp1));

}
}