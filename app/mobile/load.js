/**
 * ninja is defined in index.html with methods 
 * 	- log: print to #log textarea
 *	- load: load a external script
 */
ninja.url = 'http://'+document.getElementById('input').value+'/';
ninja.project_url = '';
ninja.project_base_url = '';

ninja.log = function(msg) {

	if(msg !== null && typeof msg === 'object'){
		msg = JSON.stringify(msg,function(censor) {
		  var i = 0;

		  return function(key, value) {
		    if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
		      return '[Circular]'; 

		    if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
		      return '[Unknown]';

		    ++i; // so we know we aren't using the original object anymore

		    return value;  
		  }
		});
	}

    $.ajax({
		url: ninja.url + "ajax_req/",
		data: {msg: msg}
    });
}
ninja.load(ninja.url + 'mobile/js/jquery.js', '', function(){
	ninja.run();
});
ninja.run = function(){
  	$('#load').text('EXEC').on('click',ninja.exec);
  	//navigator.vibrate(1000);
  	ninja.exec();
};
ninja.exec = function() {
    $('#log').text('loading...'+ninja.url);
	var data = JSON.stringify({msg: 'from app: load.js'});
    ninja.load(ninja.url + 'js/socket.io.js', '', ninja.on_io);
    return;
    $.ajax({
		url: ninja.url + "mobile/js.js",
		context: document.body
    }).done(function(exec) {
		eval(exec);
    });
};
ninja.absolutePath = function(url, base_url, server_url) {
	if(url.charAt(0) == '/'){
		return server_url + url.substring(1);
	}
	var doc = document
	, old_base = doc.getElementsByTagName('base')[0]
	, old_href = old_base && old_base.href
	, doc_head = doc.head || doc.getElementsByTagName('head')[0]
	, our_base = old_base || doc_head.appendChild(doc.createElement('base'))
	, resolver = doc.createElement('a')
	, resolved_url;
	our_base.href = base_url || '';
	resolver.href = url;
	resolved_url  = resolver.href; // browser magic at work here

	if (old_base) old_base.href = old_href;
	else doc_head.removeChild(our_base);
	return resolved_url;
}
ninja.on_io = function() {
	var socket = io.connect(ninja.url);
	socket.on('mobile_project', function(resp){
	    if(resp.error){
	        ninja.log('resp.error1');
	    }else{
	        ninja.project_url = resp.url;
			ninja.project_base_url = resp.base_url + '/';
			$.ajax({
			  	url: ninja.project_url,
			  	context: document.body
			}).done(function(html) {
				var body_regex = /<body.*>(.|\n)*?<\/body>/i;
				var body_html = body_regex.exec(html)[0].replace(/<body.*>/i,'').replace(/<\/body>/i,'');
		       	body_html = body_html.replace(/(href|src)=("|')(.*?)\2/g,function(match){
		       		var pre = '';
		            match = match.replace(/(href|src)=/, function(m){
		                pre = m;
		                return '';
		            });
		            pre += match.charAt(0);
		            var post = match.charAt(match.length-1);
		            match = match.substring(1, match.length-1);
		            return pre + ninja.absolutePath(match, ninja.project_base_url, ninja.url) + post;
		        });
				var head_regex = /<head.*>(.|\n)*?<\/head>/i;
				var head_html = head_regex.exec(html)[0].replace(/<head.*>/i,'').replace(/<\/head>/i,'');
		       	head_html = head_html.replace(/(href|src)=("|')(.*?)\2/g,function(match){
		       		var pre = '';
		            match = match.replace(/(href|src)=/, function(m){
		                pre = m;
		                return '';
		            });
		            pre += match.charAt(0);
		            var post = match.charAt(match.length-1);
		            match = match.substring(1, match.length-1);
		            return pre + ninja.absolutePath(match, ninja.project_base_url, ninja.url) + post;
		        });
				$('body').html(body_html);
				if($('head').children('.dont_remove').length){
					$('head').children().not('.dont_remove').remove();
				}else{
					$('head').children('.remove').remove();
					$('head').children().addClass('dont_remove');
				}
				$('head').append(head_html);
				setTimeout(function(){
					$( window ).trigger( "load" );
				},5000);
		        //ninja.log(head_html + body_html);
				/*
		        ninja.log('body_html');
		        ninja.log(body_html);
		        return;
				head_html = head_html.split('href="./').join('href="'+ninja.project_base_url);
				head_html = head_html.split('src="./').join('src="'+ninja.project_base_url);
				head_html = head_html.split('src="/').join('src="'+ninja.url);
				*/
			});
	    }
	});
	socket.on('news', function(resp){
	    if(resp.error){
	        ninja.log('resp.error2');
	    }else{
	    }
	});
};
