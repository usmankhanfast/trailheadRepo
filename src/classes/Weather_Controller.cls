public class Weather_Controller {

  public List<DecoratedWeather> listOfWeather {

    get {
      if (listOfWeather == null) {
        listOfWeather = new List<DecoratedWeather>();

        for (Favorite__c weather : [select name from Favorite__c]) {        
            listOfWeather.add(new DecoratedWeather(weather));
        }
      }
      return listOfWeather;
    }

    private set;
  }
}