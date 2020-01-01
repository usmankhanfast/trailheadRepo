public class AccountTriggerHandler {
    
    public static void CreateAccounts(List<Account> accList)
    {
        for(Account acc: accList)
        {
            if(acc.ShippingState == null || ( acc.BillingState != null && acc.ShippingState.compareTo(acc.BillingState) != 0))
            {
                acc.ShippingState = acc.BillingState;
            }
        }
    }
    @future(callout=true)
    public static void CreateCustomerInQB(List<Id> accList, Map<String,String> vendorSyncTokenMap)
    {
        Boolean isCreated;
        
        List<Account> accountList=[Select Id, Name, billingStreet, billingCity, billingState, billingPostalCode, billingCountry, email__c, phone, title__c, qb_customerId__c 
                                   from Account 
                                   where id=:accList];
        
        List<QB_Credentials__c> qbcList=[Select Id, Refresh_token__c, Access_token__c, realmid__c 
                                         from QB_Credentials__c];
        if(qbcList.size()>0)
        {
            for(Account acc : accountList)
            {
                isCreated = false;
                String json='{'+
                    '"FullyQualifiedName":"'+acc.Name+'",'+
                    '"PrimaryEmailAddr": {'+
                    	'"Address": "'+(acc.email__c== null ? '' : acc.email__c) + '"'+
                    '},'+
                    '"DisplayName":"'+acc.Name+' -DP'+'", '+
                    '"Title": "'+acc.title__c+'", '+ 
                    '"PrimaryPhone": {'+
                    	'"FreeFormNumber": "'+(acc.Phone==null? '': acc.Phone)+'"' +
                    '},'+ 
                    '"CompanyName":"'+acc.Name+'",'+ 
                    '"BillAddr": {'+
                        '"CountrySubDivisionCode":"'+acc.BillingState+'",'+
                        '"City": "'+acc.BillingCity+'",'+ 
                        '"PostalCode": "'+acc.BillingPostalCode+'",'+
                        '"Line1": "'+acc.BillingStreet+'",'+
                        '"Country":"'+acc.BillingCountry+'"'+
                    '},'+ 
                    '"GivenName":"'+acc.Name+'"';
                
                json = json +   '}';
                
                system.debug('json:' + json);
                HttpRequest request = new HttpRequest();
                HttpResponse response = new HttpResponse();
                Http http = new Http();
                
                request.setMethod('POST');
                request.setEndPoint(System.label.QB_API_End_Point+'/v3/company/'+qbcList[0].realmid__c+'/customer');
                request.setHeader('Authorization' , 'Bearer '+qbcList[0].Access_token__c);
                request.setHeader('Accept', 'application/json');
                request.setHeader('Content-Type' , 'application/json;charset=UTF-8');
                request.setBody(json);

                response = http.send(request);
                system.debug(json);
                if(response.getStatusCode() == 200)
                {
                    System.debug(response.getBody());
                    isCreated=true;
                }
                else if(response.getStatusCode() == 401)
                {
                    System.debug(response.getBody());
                    if(qbcList[0].Refresh_token__c!=null)
                    {
                        Map<String, Object> refreshResults= refreshToken(qbcList[0].Refresh_token__c);
                        
                        String accessToken=(String)refreshResults.get('access_token');
                        String refreshToken=(String)refreshResults.get('refresh_token');
                        
                        request.setHeader('Authorization' , 'Bearer '+accessToken);
                        response = http.send(request);
                        
                        if(response.getStatusCode() == 200)
                        {
                            System.debug(response.getBody());
                            isCreated=true;
                            qbcList[0].Access_token__c=accessToken;
                            qbcList[0].Refresh_token__c=refreshToken;
                            update qbcList[0];
                        }
                    }
                }
                System.debug(response.getBody());
                if(isCreated)
                {
                    Map<String,Object> results = (Map<String,Object>)System.JSON.deserializeUntyped(response.getBody());
                    acc.qb_customerId__c=(String)((Map<String,Object>)results.get('Customer')).get('Id');
                }
             }
            
            update accountList;
        }
    }
    
    public static Map<String, Object> refreshToken(String refreshToken)
    {
        String encodedString = EncodingUtil.base64Encode(Blob.valueOf(System.label.QB_Client_Id+':'+System.label.QB_Client_Secret));
        String endPoint = System.label.QB_Access_token_End_Point;
        
        String requestBody = 'grant_type=refresh_token&refresh_token='+refreshToken;
        
        HttpRequest httpReq = new HttpRequest();
        HttpResponse httpRes = new HttpResponse();
        Http http = new Http();
        httpReq.setMethod('POST');
        httpReq.setEndPoint(endPoint);
        httpReq.setHeader('Host', 'oauth.platform.intuit.com');
        httpReq.setHeader('Accept', 'application/json');
        httpReq.setHeader('Authorization' , 'Basic '+encodedString);
        httpReq.setHeader('Cache-Control', 'no-cache');
        httpReq.setHeader('Content-Type' , 'application/x-www-form-urlencoded');
        httpReq.setBody(requestBody);
        
        httpRes= http.send(httpReq);
        System.debug(httpRes.getStatusCode() + httpRes.getBody());
        if(httpRes.getStatusCode() == 200)
        {
            System.debug(httpRes.getBody());
            
            return (Map<String, Object>) JSON.deserializeUntyped(httpRes.getBody());
            
        }
        return null;
    }
}