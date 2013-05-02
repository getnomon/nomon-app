/*
# NAME: nomON.mobile.js
# AUTHOR: Evan Cohen
# DATE: September 2012
# USAGE: Powers the mighty application known as nomON
# REQUIREMENTS: Extreme hunger!
*/

$(function() {
	var isMobile = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|webOS)/);
	var pathname = $(location).attr('pathname');
    var add_comp = []; //address components
	//Capture click/taps

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
                        console.log(index);
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
                            {"type":"checkbox", id:"Rcheckbox"+index, name:"filter", "value":type, checked:"true"}))
                        );
                    });
                    $('#rst-types').trigger("create")
                    //$('#rst-type-fieldset').collapsibleset('refresh');
                    /*end jank type population*/
                    randomRestaurant = result[Math.floor(Math.random()*result.length)];
                    console.log('Random restaurant: '+randomRestaurant.na);
                    $('#restaurant').text(randomRestaurant.na);
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

    $('#login-form').submit(function(){
        //Pass info to server and get session!
        //Authenticate user
        $.ajax(api('u'), {
            type : 'post',
            dataType: "json",
            data: {
                func  : 'gacc',
                email : $('#inputEmail').val(),
                pass  : $('#inputPassword').val()
            }
        }).done(function(result){
            console.log(result);
            if(result.error != null){
                //user is auth
            }else{
                //boo boo fail
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

});

function api(type){
    return 'https://getnomon.com/api.php?api=' + type;
}

function validateEmail(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
};