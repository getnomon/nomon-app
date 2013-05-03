/*
# NAME: nomON.mobile.js
# AUTHOR: Evan Cohen
# DATE: September 2012
# USAGE: Powers the mighty application known as nomON
# REQUIREMENTS: Extreme hunger!
*/



$(function() {
    //enable cross domain pages
    $.support.cors = true;
    var SESSION = localStorage.getItem("session");
    var UUID = localStorage.getItem('uuid');
    if(UUID == undefined){
        UUID = guid();
        localStorage.setItem("uuid", UUID);
    }

    //ensure that we start on the front page.
    //this will change as soon as we add a login page
    //this causes a strange bug when going to the second screen
    //so for now it will be disabled
    //$.mobile.changePage('#page-address');

    var version = 0.87;


	var isMobile = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|webOS)/);
	var pathname = $(location).attr('pathname');
    var add_comp = []; //address components
	//Capture click/taps

    //Get the message of the day && get session :)
    console.log("sid: " + SESSION + " | uid: " + UUID);
    $.ajax(api('u'), {
        crpssDomain: true,
        type: 'post',
        dataType: 'json',
        data:{
            session_id  : SESSION,
            uuid        : UUID,
            motd        : true,
            get_session : true,
            useragent   : navigator.userAgent,
            ver         : version
        }
    }).done(function(data){
        $('#motd').html(data.motd);
        //This should never have to happen
        if(data['ver'] != undefined){$('body').html(data.ver);}
        console.log(data); //should give us back a session ID (to store in a cookie?)


        if(!data.auth){
            console.log('User is not authenticated, we should rediredt');
            $.mobile.changePage($('#page-login'));
        }else{
            console.log('User is already authenticated!');
            //TODO: Get their addresses
            getKnownAddresses($('#address-front'));
        }
    }).fail(function(){
        alert('nomON requires an internet connection!');
    }); 

    //if the session doesn't exist

    //$.mobile.changePage("#page-address");
    $('#getnomon, .select-address').on('click', function(){
        if($(this).attr('id') == "getnomon" && $('#address').val() == ""){
            alert('Please enter your address');
            return false;
        }else{
            //we dont really have to geo-validate the address because we already
            //know it's valid. But for now let's just revalidate to keep
            //it simple
            //TODO: remove redundant validation on known address
            address = "";
            if($(this).hasClass('select-address')){
                address = $(this).text();
            }else{
                address = $('#address').val();
            }

            $.get(geoValidate(address)).done(function(data) { 
                //got data, now what?
                console.log(data.results);
                $.each(data.results[0].address_components, function(index, addr){
                    add_comp[addr.types[0]] = addr.short_name;
                });
                console.log(add_comp);
                //make delivery request based on address

                toggleLoad(true);
                $.ajax(api('r'), {
                    crossDomain: true,
                    type : 'POST',
                    dataType: "json",
                    data: {
                        func : 'dl',
                        addr : add_comp.street_number+" "+add_comp.route,
                        city : add_comp.locality,
                        state: add_comp.administrative_area_level_1,
                        zip  : add_comp.postal_code
                    }
                }).done(function(result){
                    console.log(result);
                    //Inject the number of results into the headder
                    //$('#rest-count').text(result.length);
                    //console.log(result);

                    /*begin jank type population*/
                    types = [];
                    $.each(result, function(index, rst){
                        if(!(typeof rst.cu === 'undefined')){
                            types.push(rst.cu[0]);
                        }
                    });
                    unique_types = unique(types);
                    unique_types.reverse();

                    $('#rst-types').html('');
                    $.each(unique_types, function(index, type){
                        $('#rst-types').append($('<label>', {class:"checkbox", text:type})
                            .prepend($('<input>', 
                            {"type":"checkbox", id:"Rcheckbox"+index, name:"filter", 
                                "value":type, checked:"true", "data-theme": 'd'}))
                        ).trigger("create"); /*might want to call */
                    });
                    //$('#rst-types').trigger("create");
                    //$('#restrictions').collapsibleset('refresh');

                    /*end jank type population*/
                    randomRestaurant = result[Math.floor(Math.random()*result.length)];
                    console.log('Random restaurant: '+randomRestaurant.na);
                    $('#restaurant').text(randomRestaurant.na);
                    toggleLoad(false);
                }).fail(function(jqXHR, textStatus, errorThrown){
                    alert('Could not find any restaurants for this location');
                    console.log(jqXHR);
                    console.log(textStatus);
                    console.log(errorThrown);
                });
            }).fail(function(jqXHR, textStatus, errorThrown){ 
                alert('Could not validate address.'); 
                return false;
            });
        }

    	//return false;
    });

    $('#getnomon').on('click', function(){
        //validate address! 
        //We might want to keep this somwhere on the page so the user knows
        //if they want to change it... And we could display the number of
        //restaurants delivering along side it. Maybe in a menu? Could be red 
        //top menu (which ties in with button collor). This menu would also let
        //the user navagete back and forth on the pages.

    });

    $('#logout').on('click', function(){
        $.ajax(api('r'), {
            crossDomain: true,
            type : 'get',
            dataType: "json",
            data: {
                session_id  : SESSION,
                uuid        : UUID,
                logout  : true
            }
        }).done(function(result){
            //unset our session
            localStorage.setItem("session", undefined);
            localStorage.setItem("uuid", UUID);
            alert('Logout successful');
            $.mobile.changePage($('#page-login'));
        }).fail(function(jqXHR, textStatus, errorThrown){
            alert('nomON needs internet connection to log out...');
        });
        //refresh or something
    });

    $('#login-form').submit(function(){
        //Pass info to server and get session!
        //Authenticate user
        $.ajax(api('u'), {
            crossDomain: true,
            type : 'post',
            dataType: "json",
            data: {
                start_session : UUID,
                func  : 'gacc',
                email : $('#inputEmail').val(),
                pass  : $('#inputPassword').val()
            }
        }).done(function(result){
            console.log(result);
            if(result.error != undefined){
                //incorrect 
                alert('Incorrect username and/or password');
            }else{
                //get our session id back
                SESSION = result.sid;
                localStorage.setItem("session", SESSION);
                console.log('User has logged in with sid: ' + SESSION);
                getKnownAddresses($('#address-front')); //populate addresses
                $.mobile.changePage($('#page-address'));
            }
        }).fail(function(jqXHR, textStatus, errorThrown){
            console.log(errorThrown);
            if(errorThrown.error != null){
                console.log(errorThrown.error.text);
                alert('Wrong username and/or password');
            }else{
                alert('Check your internet connection');
            }
        });
        return false;
    });

    $('#get-hash').on('click', function(){
        //Pass info to server and get session!
        //Authenticate user
        $.ajax(api('u'), {
            type : 'post',
            dataType: "json",
            data: {
                func        : 'gacc',
                session_id  : SESSION,
                uuid        : UUID
            }
        }).done(function(result){
            console.log(result);
            if(result.error != undefined){
                //incorrect 
                alert('Incorrect username and/or password');
            }else{
                console.log('Shit checks out, you are auth and good to go!');
            }
        }).fail(function(jqXHR, textStatus, errorThrown){
            console.log(errorThrown);
        });
        return false;
    });

    //accepts the id of a controll group
    function getKnownAddresses(target){
        $.ajax(api('u'), {
            type : 'post',
            dataType: "json",
            data: {
                func  : 'gaddr',
                session_id : SESSION,
                uuid        : UUID,
                addrNick    : 'Home'
            }
        }).done(function(result){
            console.log('got address');
            console.log(result);
            if(result.error != undefined){
                //incorrect 
                alert("Couldn't find any known addresses :'( Please Contact support@getnomon.com");
            }else{
                target.append($('<a>', {href:"#page-price", class:"select-address", text: result.addr,
                    "data-value":"Home", "data-role":"button", "data-transition":"slide"})).trigger("create");
            }
            target.controlgroup("refresh");
        }).fail(function(jqXHR, textStatus, errorThrown){
            console.log(errorThrown);
        });
    }

    //Genaric Cross app/web code

	$('#location').on('click', function(){
		navigator.geolocation.getCurrentPosition(getLocation, getLocationFail, {enableHighAccuracy: true});
    });

    resizeTitle();
    $(window).resize(function() {
        resizeTitle();
    });

    //$('#rest-count').tooltip({placement:'bottom', trigger:'click'});
    function getLocation(location){
    	$.get(geoURL(location)).done(function(data) { 
			$('#address').val(data.results[0].formatted_address);
		}).fail(function(){ alert('Could not find your location.');});
    }

    function getLocationFail(location){
    	alert('Could not find you! Make sure location services are enabled for nomON.');
    }

    function geoURL(location){
    	return 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+
				location.coords.latitude+','+location.coords.longitude+
				'&sensor='+((isMobile) ? 'true' : 'false');
    }

    function geoValidate(address){
        http://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&sensor=true_or_false
        return 'https://maps.googleapis.com/maps/api/geocode/json?address='+
                address+'&sensor='+((isMobile) ? 'true' : 'false');
    }

    function resizeTitle(){
        size = window.innerWidth/6;
        fontSize = (size > 82) ? 82 + 'px':  size + 'px';
        $('h1.title-front').css('font-size', fontSize);
    }

    function unique(array){
        return array.filter(function(el,index,arr){
            return index == arr.indexOf(el);
        });
    }

    //True to enable, false to disable
    function toggleLoad(toggle){
        if(toggle){
            $.mobile.loading('show', {
                text: '',
                textVisible: true,
                theme: 'z',
                html: ""
            });
        }else{
            $.mobile.loading('hide');
        }
    }

    /*Settings Stuff*/

});

function api(type){
    return 'https://getnomon.com/api.php?api=' + type;
}

function validateEmail(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
};

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}
/*function doNotCall(){
    setInterval(function() {
        //call $.ajax here
    }, 5000); //5 seconds
}*/