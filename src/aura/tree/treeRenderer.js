({
	// Your renderer method overrides go here
    afterRender : function(cmp,helper){
        var acctlistInput = cmp.find("atcmplbox").getElement().value;
        acctlistInput.setAttribute("list","acctlist");
        return this.superAfterRender();
    }
})