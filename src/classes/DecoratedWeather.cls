public class DecoratedWeather {

  public Favorite__c weather { get; private set; }

  public DecoratedWeather (Favorite__c weather) {
            this.weather = weather;  
  }

  public Decimal tempInCelcius { 
    get {
      if (weather != null && tempInCelcius == null )
        tempInCelcius = null;//new Temperature().FtoC(weather.TempInFahrenheit__c);
                    
      return tempInCelcius;  
    }   
    set {
      if (weather != null && value != null ) 
        weather.Temp__c='';//new Temperature().CtoF(value);
        
            tempInCelcius = value;
    }
  }
}