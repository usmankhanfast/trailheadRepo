public class QuickbookCon {
    public static String client_Id = 'L06KqX6mIeurhhxH1Vn3adRi0Co7y7v8KCMAYTXKXrUUODdlDH';
    public static String client_Secret = 'EXrlf7I2PFHNoRTNpTEzxioDW42ArZXylBlIEQgB';
    public static String redirect_URI = 'https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl';//https://trailatrt-dev-ed.my.salesforce.com/apex/QuickbookCon';

    public static PageReference doAuthorizationQuickBooks(){

        String authorization_endpoint = 'https://appcenter.intuit.com/connect/oauth2';
        String scope = 'com.intuit.quickbooks.accounting';
        String final_EndPoint = authorization_endpoint+'?client_id='+client_Id+'&scope='+scope+'&redirect_uri='+redirect_URI+'&response_type=code&state=PlaygroundAuth#/Authorize/IDb7t3mkb6w2';

        PageReference pageRef = new PageReference(final_EndPoint);
        return pageRef;
    }

    public static void doFetchAccessToken(){

        String encodedString = EncodingUtil.base64Encode(Blob.valueOf(client_Id+':'+client_Secret));
        String endPoint = 'https://developer.intuit.com/v2/';
        String oAuthCode = ApexPages.currentPage().getParameters().get('code');
        String requestBody ='grant_type=authorization_code&code='+oAuthCode+'&redirect_uri=https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl';
        String errorMessage ='';

        HttpRequest req = new HttpRequest();
        req.setMethod('POST');
        req.setEndPoint(endPoint);
        req.setHeader('Content-Type' , 'application/x-www-form-urlencoded');
        req.setHeader('Accept', 'application/json');
        req.setHeader('Authorization' , 'Basic '+encodedString);
        req.setBody(requestBody);

        HttpResponse res = new HttpResponse();
        Http h = new Http();

        res = h.send(req);
        
        if(res.getStatusCode() == 200)
        {
            System.debug('Inside if : ' +res.getStatusCode());
            String body = res.getBody();
            System.debug(body);
            Map<String, Object> response_Map = (Map<String, Object>)JSON.deserializeUntyped(res.getBody());
            system.debug(json.deserializeUntyped(res.getBody()));
            
            /*List<Quickbooks_Token_Info__c> connectSettingInfos = new List<Quickbooks_Token_Info__c>();
            
            connectSettingInfos = [Select Id, Name,Expires_In_Time__c From Quickbooks_Token_Info__c Where Name ='QuickBooks Setting Info'];
            
            Quickbooks_Token_Info__c quickBooksSettingInfo = new Quickbooks_Token_Info__c();
            
            String Name = 'QuickBooks Setting Info';
            String accessToken = (String)response_Map.get('access_token');
            String refreshToken = (String)response_Map.get('refresh_token');
            
            Decimal expiresIn = (Decimal)response_Map.get('expires_in');
            Decimal expiresInRefToken = (Decimal)response_Map.get('x_refresh_token_expires_in');
            
            quickBooksSettingInfo.Name = Name;
            quickBooksSettingInfo.Access_Token__c = accessToken;
            quickBooksSettingInfo.Refresh_Token__c = refreshToken;
            quickBooksSettingInfo.Expire_In_Seconds__c = expiresIn;
            quickBooksSettingInfo.Refresh_Token_Expires_In__c = expiresInRefToken;
            quickBooksSettingInfo.Expires_In_Time__c = System.Now().addSeconds(Integer.valueOf(expiresIn));
            
            if(connectSettingInfos!=null && connectSettingInfos.size() > 0 ) 
                
                quickBooksSettingInfo.Id = connectSettingInfos[0].Id;
            
            upsert quickBooksSettingInfo;*/
            ApexPages.addmessage(new ApexPages.message(ApexPages.severity.Confirm,'Successfully Authenticated with Quickbooks System!!!'));
        }
        else
        {
            ApexPages.addmessage(new ApexPages.message(ApexPages.severity.ERROR,'Error while communicating with Quickbooks API'+ 'Status '+ res.getStatus() +' and Status Code '+res.getStatuscode()));
            
        }
    }

    public static void doRefreshAccessToken()
    {
        String encodedString = EncodingUtil.base64Encode(Blob.valueOf(client_Id+':'+client_Secret));
        String endPoint = 'https://developer.intuit.com/v2/';

        /*List<Quickbooks_Token_Info__c> QBInfo = new List<Quickbooks_Token_Info__c>();

        QBInfo = [Select Id, Name,Expires_In_Time__c, Refresh_Token__c,Refresh_Token_Expires_In__c  From Quickbooks_Token_Info__c Where Name ='QuickBooks Setting Info'];

        String oAuthCode = ApexPages.currentPage().getParameters().get('code');
        String requestBody = 'grant_type=refresh_token&refresh_token=';

        if(QBInfo!=null && QBInfo[0].Refresh_Token__c != null)
        {

            requestBody+= QBInfo[0].Refresh_Token__c;
        }
        else
        {
            ApexPages.addmessage(new ApexPages.message(ApexPages.severity.ERROR,'Refresh Token is NULL'));

        }*/
        String errorMessage ='';
        HttpRequest req = new HttpRequest();

        Http h = new Http();
        req.setMethod('POST');
        req.setEndPoint(endPoint);
        req.setHeader('Authorization' , 'Basic '+encodedString);
        req.setHeader('Content-Type' , 'application/x-www-form-urlencoded');
        //req.setBody(requestBody);

        HttpResponse res = new HttpResponse();

        try
        {
            /*if(QBInfo != null && QBInfo[0].Expires_In_Time__c <= System.Now())
            {

                res = h.send(req);
                if(res.getStatusCode() == 200)
                {
                    Map<String, Object> response_Map = (Map<String, Object>)JSON.deserializeUntyped(res.getBody());
                }
                else
                {
                    ApexPages.addmessage(new ApexPages.message(ApexPages.severity.ERROR,'Error  communicating with Quickbooks API'+ 'Status '+ res.getStatus() +' and Status Code '+res.getStatuscode()));
                }
            }*/
        }
        catch(System.Exception e)
        {
            System.debug('#### Exception Executed '+e.getStackTraceString());
            if(String.valueOf(e.getMessage()).startsWith('Unauthorized endpoint'))
            {
                errorMessage = 'Unauthorize endpoint'+' Remote Site Setting and add '+' '+ endPoint +' Endpoint';
                ApexPages.addmessage(new ApexPages.message(ApexPages.severity.ERROR,errorMessage));


                //return null;

            }
            else
            { 
                errorMessage = 'Unexpected Error '+'Status '+res.getStatus()+' and Status Code '+res.getStatuscode();
                ApexPages.addmessage(new ApexPages.message(ApexPages.severity.ERROR,errorMessage));

                //return null;

            }
        }
    }
}