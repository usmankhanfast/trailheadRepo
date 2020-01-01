public class QuickbookConnection {
    
    public static String client_Id = System.label.QB_Client_Id;
    public static String consumer_Secret = System.label.QB_Client_Secret;
    public string realmId;
    
    public QB_Credentials__c qbc{get; set;}
    public string codeparam{get;set;}
    public string baseurl{get;set;}
    
    public QuickbookConnection()
    {
        codeparam=apexpages.currentpage().getparameters().get('code'); 
        realmId=apexpages.currentpage().getparameters().get('realmId'); 
        baseurl =   System.URL.getSalesforceBaseUrl().toExternalForm() + '/apex/QBConfigPage';
    }
    
    public QB_Credentials__c getQbCred()
    {
        List<QB_Credentials__c> qbcList=[Select Id from QB_Credentials__c];
                                                         
        if(qbcList.size()>0)
        {
            return qbcList[0];
        }
        
        return null;
    }
    
    /*
* @Name - doAuthorizationQuickBooks
* @Param - None
* @Description - to get the authentication code from the QuickBooks Account
* @ReturnType - PageReference
*/
    
    public PageReference doAuthorizationQuickBooks(){
        
        String authorization_endpoint = System.label.QB_Authorization_End_Point;
        
        String scope = System.label.QB_Authorization_Scope;
        
        String final_EndPoint = authorization_endpoint+'?client_id='+client_Id+'&response_type=code&scope='+
            scope+'&state=123445633443&redirect_uri='+baseurl;
        
        PageReference pageRef = new PageReference(final_EndPoint);
        return pageRef;
    }
    
    /*
* @Name - doFetchAccessToken
* @Param - None
* @Description - to get the Access Token , Refresh Token and other Information after getting the authentication code
* @ReturnType - void
*/
    
    public void doFetchAccessToken(){
        
        if(codeparam!=null && realmId!=null)
        {
            String encodedString = EncodingUtil.base64Encode(Blob.valueOf(client_Id+':'+consumer_Secret));
            String endPoint = System.label.QB_Access_token_End_Point;
            String errorMessage ='';
            
            HttpRequest httpReq = new HttpRequest();
            HttpResponse httpRes = new HttpResponse();
            Http http = new Http();
            httpReq.setMethod('POST');
            httpReq.setEndPoint(endPoint);
            httpReq.setHeader('Authorization' , 'Basic '+encodedString);
            httpReq.setHeader('Host', 'oauth.platform.intuit.com');
            httpReq.setHeader('Accept', 'application/json');
            httpReq.setHeader('Content-Type' , 'application/x-www-form-urlencoded');
            httpReq.setBody('grant_type=authorization_code&code='+codeparam+'&redirect_uri='+baseurl);
            
            httpRes = http.send(httpReq);
            
            if(httpRes.getStatusCode() == 200)
            {
                System.debug(httpRes.getBody());                
                Map<String, Object> results = (Map<String, Object>) JSON.deserializeUntyped(httpRes.getBody());
                
                String accessToken=(String)results.get('access_token');
                String refreshToken=(String)results.get('refresh_token'); 
                String realmId=realmId; 
                
                if(accessToken!=null)
                {
                    QB_Credentials__c qbc=new QB_Credentials__c();
                    List<QB_Credentials__c> qbcList=[Select Id from QB_Credentials__c
                                                                     where RealMId__c=:realmId];
                    if(qbcList.size()>0)
                    {
                        //qbc.Access_token__c=accessToken;
                        qbc.Refresh_token__c=refreshToken;
                        qbc.Id=qbcList[0].Id;
                    }
                    else
                    {
                        //qbc.Access_token__c=accessToken;
                        qbc.Refresh_token__c=refreshToken;
                        qbc.realmid__c=realmId;
                    }
                    upsert qbc;
                }  
            }   
        }
    }   
}