'use strict';
/* 
  Structure:

  - init (
    - run_server (
      - template_engine (
        - get_projects() -> after_get_projects()
        - register_helpers()
        - walk_files() -> after_walk_files (
            - reload_partials(
              - registerPartial()
            )
            - ajax(
              -set_template_data()
            )
          )
        - get_template_data()
      )
    )
  )

*/
var app = {

// Properties

  gui_lib: require("nw.gui"),

  fs_lib: require("fs"),

  ncp_lib: require('ncp'),

  express_lib: require("express"),

  io_lib: require("socket.io"),

  http_lib: require('http'),

  os_lib: require('os'),

  path_lib: require('path'),

  walk_lib: require('walk'),

  hbs_lib: require('hbs'),

  opener: require('open'),

  child_process: require('child_process'),

  portfinder: require('portfinder'),

  projects: [],

  project_pages: {},

  partials: [],

  template_data: {},

  window: false,

  express: false,

  http: false,

  walk: false,

  io: false,

  ncp: false,

  dirname: false,

  port: false,

  ip: 'localhost',

  projects_folder: false,

  projects_url: false,

  sass: false,

  debug: true,

  editor: false,

  exec: false,

  options: false,

  package: false,

  init_time: false,

  log: function(argument, extra) {
    if(extra){
      console.log(Date.now() - app.init_time, argument, extra);
    }else{
      console.log(Date.now() - app.init_time, argument);
    }
  },

/*
    ██     ██ ██ ███    ██ ██████   ██████  ██     ██ 
    ██     ██ ██ ████   ██ ██   ██ ██    ██ ██     ██ 
    ██  █  ██ ██ ██ ██  ██ ██   ██ ██    ██ ██  █  ██ 
    ██ ███ ██ ██ ██  ██ ██ ██   ██ ██    ██ ██ ███ ██ 
     ███ ███  ██ ██   ████ ██████   ██████   ███ ███  
*/

  close: function(){
    window.close();
  },

  maximize: function() {
    app.window.maximize();
  },

  minimize: function() {
    app.window.minimize();
  },

  reload: function() {
    location.reload();
  },

  inspect: function() {
    if (!app.window.isDevToolsOpen()) {
      var devtools = app.window.showDevTools();
    }
  },

  resizers: function() {
    $('#help_resizer').mousedown(function(){
      $('#content').addClass('resizing');
      $(window).on('mousemove', function(event) {
        var bottom = window.innerHeight - event.pageY;
        $('#help').height(bottom - 30);
        $('#content').css('bottom', bottom - 10);//event.pageY - 60
      });
    });
    $('#help_resizer').mouseup(function(){
      $('#content').removeClass('resizing');
      $(window).off('mousemove');
    });
    $('#app_resizer').mousedown(function(){
      $('#content').addClass('resizing');
      $(window).on('mousemove', function(event) {
        $('#app').css('right', window.innerWidth - event.pageX + 10);
        $('#side_app').css('left', event.pageX - 10);
      });
    });
    $('#app_resizer').mouseup(function(){
      $('#content').removeClass('resizing');
      $(window).off('mousemove');
    });
  },

  load_home: function() {

    app.load_template({
      action: 'main',
      target: '#app'
    });
/*
    app.load_template({
      action: 'menu',
      target: '#menu'
    });
*/
    $('.window').addClass('home');
    $('#content').removeClass('half');
    $('#qr').removeClass('open');
  },

  /**
   * Append developer tools button if in SDK mode
   */
  dev_tools: function(){
    if(typeof app.window.isDevToolsOpen === "function"){
      //$('#top-titlebar').append('<button class="app_button" data-run="inspect">Open Developer Tools</button>');
      app.inspect();
    }
  },

  /**
   * Changes visible content on #side_app
   */
  side_app: function(target) {
    $('#side_app').children('.panel').removeClass('visible');
    $('#'+target).addClass('visible');
    $('#content').addClass('half');
  },

  /**
   * Hides #side_app
   */
  close_side_app: function() {
    $('#content').removeClass('half');
    $('#app').removeAttr('style');
    $('#side_app').removeAttr('style');
  },

/*
    ██████  ██    ██ ████████ ████████  ██████  ███    ██ ███████ 
    ██   ██ ██    ██    ██       ██    ██    ██ ████   ██ ██      
    ██████  ██    ██    ██       ██    ██    ██ ██ ██  ██ ███████ 
    ██   ██ ██    ██    ██       ██    ██    ██ ██  ██ ██      ██ 
    ██████   ██████     ██       ██     ██████  ██   ████ ███████ 
*/

  /**
   * Bind actions to buttons 
   * 
   * Buttons call function from data-run with parameters from data-args
   */
  bind_buttons: function(){
    app.log('--> bind_buttons');
    $('.window').on('click','.app_button', function() {
      console.log($(this).data('run'));
      if (typeof $(this).data('args') !== 'undefined') {
        app[ $(this).data('run') ]( $(this).data('args'), $(this) );
      }else{
        app[ $(this).data('run') ]( $(this) );
      }
    });
    $('.window').on('scroll','.app_button', function() {
      console.log('scroll');
      $(this).siblings('iframe').scroll();
    });
  },

  /**
   * Open or close folder in pages view
   */
  toggle_folder: function($this) {
    var $icon = $this.children('.fa');
    if($icon.hasClass('fa-folder')){
      $icon.removeClass('fa-folder').addClass('fa-folder-open');
    }else{
      $icon.removeClass('fa-folder-open').addClass('fa-folder');
    }
    $this.siblings().toggle(200);
  },

  /**
   * Prints the link as QR
   */
  generate_qr: function(url) {
    var $qr = $("#qr_img");
    $qr.html('');
    $("#qr_url").html(url);
    $("#qr").addClass('open');
    new QRCode($("#qr_img")[0], url);
  },

  /**
   * Opens file in a iframe
   */
  preview: function(url, $this) {

    app.side_app('preview_wrapper');
    
    $('#preview_wrapper .title').text(url.replace(app.projects_url, ''));

    $('#preview').html(`
      <div>
        <iframe src="${url}"></iframe>
      </div>
    `);
  },

  open_firefox: function(file) {
    app.log('--> open');
    app.opener(file, 'firefox');
  },

  open_chrome: function(file) {
    app.log('--> open');
    app.opener(file, 'google-chrome');
  },

  open_sublime: function(file) {
    app.log('--> open');
    app.opener(file, 'subl');
  },

  open: function(file) {
    app.log('--> open');
    app.opener(file);
  },

  /**
   * Opens selected file with Ace editor
   */
  edit_file: function(path){

    app.side_app('editor_wrapper');

    $('#editor_wrapper .title').text(path.replace(app.projects_folder, ''));

    $('#editor_wrapper .menu .save_file').data('args', path);

    app.editor.getSession().setMode("ace/mode/" + app.path_lib.extname(path).replace('.',''));

    app.fs_lib.readFile(path, 'utf8', function(err, data) {
      if (err) {
        console.log(err);
      }else{
        app.editor.setValue(data);
      }
    });
  },

  /**
   * Save editor's file
   */
  save_file: function(path) {
    console.log(path,app.editor.getValue());
    app.fs_lib.writeFile(path, app.editor.getValue(), function(e){
      if (e) console.log(e);
      app.help(path+" saved!");
    });
  },

  /**
   * Shows the help console
   */
  show_help: function(force){
    $('#top-titlebar-buttons .ion-help').removeClass('error');
    switch(force) {
      case 'open':
        $('.window').addClass('help_open');
      break;
      case 'close':
        $('.window').removeClass('help_open');
      break
      default:
        $('.window').toggleClass('help_open');
    }
    if(!$('.window').hasClass('help_open')){
      $('#content').data('style',$('#content').attr('style'));
      $('#content').removeAttr('style');
    }else{
      $('#content').attr('style',$('#content').data('style'));
    }
  },

  /**
   * Prints messages to the help console
   */
  help: function(text, type){
    var now = new Date();
    type = typeof type !== 'undefined' ? type : 'help';
    $('#help_content .notice').not('old').each(function(){
      if(2000 + $(this).data('time') < now ) {
        $(this).addClass('old');
      }
    });
    $('#help_content').append(`
      <div class="notice ${type}" data-time="${now.getTime()}">
        <i class="icon ion-${type}"></i>
        <span class="date">${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}</span>
        ${text}
        <i class="ion-close" onclick="$(this).parent().remove()"></i>
      </div>
    `);
    if(type == 'alert') {
      $('#top-titlebar-buttons .ion-help').addClass('error');
    }else{
      $('#top-titlebar-buttons .ion-help').addClass('bright');
      setTimeout(function(){
        $('#top-titlebar-buttons .ion-help').removeClass('bright');
      },400);
    }
    $('#help_content').animate({ scrollTop: $('#help_content')[0].scrollHeight});
  },

  /**
   * Open or close menu
   */
  toggle_menu: function() {
    $('.window').toggleClass('menu_open');
  },

  /**
   * Sets the appearance of the app
   */
  set_theme: function(theme) {
    $(".window").removeClass (function (index, css) {
      return (css.match (/(^|\s)theme-\S+/g) || []).join(' ');
    });
    $('.window').addClass('theme-' + theme);
  },

  new_project: function() {
    $('.new_project').toggleClass('view_form');
  },

  create_project: function() {
    app.new_project();
    var project_name = $('.new_project .new_title').val().toLowerCase().replace(' ','_');
    if($('.new_project label input').is(':checked')) project_name += '_app';
    var path = app.projects_folder + app.path_lib.sep + project_name;
    var content = `
<!DOCTYPE html>
<html>
  <head>
    <title>${$('.new_project .new_title').val()}</title>
  </head>
  <body>
    <h1>${$('.new_project .new_title').val()}</h1>
  </body>
</html>
    `;
    app.fs_lib.mkdir(path, function() {
      app.fs_lib.writeFile(path + app.path_lib.sep + 'index.html', content, function(e){
        if(e) {
          console.log(e);
        }else{
          app.projects.push({
            project: project_name,
            is_app: project_name.endsWith('_app')? ' is_app': '',
            url: app.projects_url + project_name + app.path_lib.sep + 'index.html',
            files_ajax_data: JSON.stringify({
              project: project_name,
              action: 'pages',
              target: '#app'
            }),
            mob_ajax_data: JSON.stringify({
              url: app.projects_url + project_name + app.path_lib.sep + 'index.html',
              base_url: app.projects_url + project_name
            })
          });
          app.load_home();
        }
      });
    })
  },

  /**
   * Sets if the projects are loaded in iframes on the main page
   */
  preview_projects: function(args) {
    app.options.preview_projects = (args == true);
    if(args == true){
      $('.iframe_wrapper iframe').each(function(){
        $(this).attr('src', $(this).attr('src').substr(1)).parent().removeClass('hidden');
      });
    }else{
      $('.iframe_wrapper iframe').each(function(){
        $(this).attr('src','_' + $(this).attr('src')).parent().addClass('hidden');
      });
    }
    app.fs_lib.writeFile(app.dirname + app.path_lib.sep + 'options.json', JSON.stringify(app.options,null,2), function(e){
      if(e) console.log(e);
    });
  },

  /**
   * Sets if the app uses the native window or the custom appearance
   */
  native_window: function(args) {
    app.package.window.frame = (args == true);
    app.fs_lib.writeFile(app.dirname + app.path_lib.sep + 'package.json', JSON.stringify(app.package,null,2), function(e){
      if(e) console.log(e);
      app.show_help('open');
      app.help("The use of native window won't take place until restart.");
    });
  },

  /**
   * Hide all files except for one type
   */
  filter_files: function(type, $this){
    var $target = $this.closest('.pages');
    $target.find('.visible').removeClass();
    if(type == 'all'){
      $target.removeClass('filtered');
    }else{
      $target.addClass('filtered').find('.'+type).parentsUntil('#pages','li').not('.visible').addClass('visible');
      $target.find('ul').each(function(){
        $(this).children('.visible').last().addClass('last');
      });
    }
  },

  /**
   * Show a qr code for downloading the app
   */
  download_app: function(url){
    app.generate_qr(url);
    app.toggle_menu();
  },

  /**
   * Select css sass
   *
   * Selects a sass file and opens css files list to choose compilation target.
   */
  select_css_sass: function(scss_file, $this) {
    app.log('--> select_css_sass');
    app.help('Select a css file to compile to.');
    $this.parent().parent().addClass('active');
    $('#pages').addClass('disabled');
    var $css_files = $('#pages').clone().removeAttr('id');
    $css_files.find('.visible').removeClass('visible');
    $css_files.addClass('filtered ').find('.css').parentsUntil('#pages','li').not('.visible').addClass('visible');
    //$css_files.find('li').not('.visible').remove();
    $css_files.find('.app_button').not('.folder').remove();
    $css_files.find('.file').addClass('app_button').data('run','compile_sass').data('args',scss_file);
    $css_files.children('.button_set').replaceWith('<h3 class="select_css">Select css target</h3>');

    $('#css_files').html($css_files);

    app.side_app('css_files');
    
    $('#content').addClass('half');
  },

  /**
   * Unselect css sass
   *
   * Removes selection.
   */
  unselect_css_sass: function($this) {
    $this.parent().parent().removeClass('active');
    $('#pages').removeClass('disabled');
    $('#content').removeClass('half');
  },

  /**
   * Export project to html
   *
   * Export project to exports folder
   */
  to_html: function(project) {
    var source = app.projects_folder + app.path_lib.sep + project;
    var destination = app.dirname + app.path_lib.sep + 'exports' + app.path_lib.sep + project;
    var timeout = false;
    var has_index = false;
    console.log('to_html ', project,source, destination);
    app.ncp(source, destination, {
      filter: function(filename) {
        console.log('filter ', filename);
        if(filename.endsWith(app.path_lib.sep+'partials')){
          return false;
        }else{
          return true;
        }
      },
      transform: function (read, write) {
        console.log(read);
        if (read.path.endsWith('.html')) {
          var url = 'http://'+app.ip+':'+app.port + read.path.replace(app.dirname, '');
          console.log('url',url);
          $.ajax({
            url: url,
            context: document.body
          }).done(function(html) {
            console.log('write',write);
            app.fs_lib.writeFile(write.path, html, function(e){
              if(e) console.log(e);
              console.log(has_index);
              if(!has_index){
                clearTimeout(timeout);
                if(write.path.endsWith('index.html')){
                  has_index = true;
                }
                timeout = setTimeout(function() {
                  var path = write.path.substring(0, write.path.lastIndexOf('/'));
                  app.help('Project exported to ' + path);
                  app.open(path);
                }, 500);
              }
            });
          });
        }else{
          read.pipe(write);
        }
      }
    }, function (err) {
      if (err) {
        return console.error(err);
      }
      console.log('done!');
    });
  },

/*
     ██████  █████  ██      ██      ██████   █████   ██████ ██   ██ ███████ 
    ██      ██   ██ ██      ██      ██   ██ ██   ██ ██      ██  ██  ██      
    ██      ███████ ██      ██      ██████  ███████ ██      █████   ███████ 
    ██      ██   ██ ██      ██      ██   ██ ██   ██ ██      ██  ██       ██ 
     ██████ ██   ██ ███████ ███████ ██████  ██   ██  ██████ ██   ██ ███████ 
*/

  /**
   * After get projects
   *
   * Called after app.projects array is full of projects
   * Callback for by app.get_projects()
   */
  after_get_projects: function() {
    app.log('--> after_get_projects');
  },
  
  /**
   * After register partials
   *
   * Called after app.partials array is full of partials
   * Callback for app.walk_files()
   */
  after_walk_files: function() {
    app.log('--> after_walk_files');

    app.reload_partials();

    app.load_template({
      action: 'main',
      target: '#app'
    });

    app.load_template({
      action: 'menu',
      target: '#menu'
    });

    $('.window').addClass('after_walk_files');

  },

/*
    ███████  █████  ███████ ███████        ██         ██████ ███████ ███████ 
    ██      ██   ██ ██      ██             ██        ██      ██      ██      
    ███████ ███████ ███████ ███████     ████████     ██      ███████ ███████ 
         ██ ██   ██      ██      ██     ██  ██       ██           ██      ██ 
    ███████ ██   ██ ███████ ███████     ██████        ██████ ███████ ███████ 
*/

  /**
   * Inject scripts
   *
   * Adds scripts to head or footer
   * Used by app.template_engine()
   */
  inject_scripts: function(html,scripts) {
    
    var head_scripts = `
      <script type="text/javascript">var ninja_host = "http://${app.ip}:${app.port}"</script>
      <script type="text/javascript" src="/js/socket.io.js"></script>
      <script type="text/javascript" src="/js/client.js"></script>
    `;
    var footer_scripts = '';
    for (var src in scripts) {
      var data = scripts[src];
      if(data !== null && typeof data === 'object'){
        if(data.hasOwnProperty('in_footer') && data.in_footer){
          footer_scripts += '<script type="text/javascript" src="'+src+'"></script>';
        }else{
          head_scripts += '<script type="text/javascript" src="'+src+'"></script>';
        }
      }
    }
    html = html.replace('</head>', head_scripts + '</head>');
    if(footer_scripts != '') {
      html = html.replace('</body>', footer_scripts + '</body>');
    }
    return html;
  },
  
  /**
   * Live css
   *
   * Watches css files and emit ninja_reload_style event when saved
   * Css file reload is made by client.js wich is injected in template_engine()
   * Used by client.js
   */
  live_css: function (next,filepath) {
    console.log(filepath);
    //next(null);
    //return;
    app.fs_lib.watch(filepath, function(event, filename){
      console.log('live_css -- watch CALLBACK ^_^');
      app.io.sockets.emit('ninja_reload_style', { event: event, outFile: filename });
    });
    next(null);
  },

  /**
   * Get sass files
   *
   * Populates scss_files & scss_paths arrays by reference recursively
   * Used by app.compile_sass()
   */
  get_sass_files: function(folder, scss_files, scss_paths, sass_dir){
    for (var sub_folder in folder ) {
      if(sub_folder == 'sass__front_ninja'){
        for (var i = folder.sass__front_ninja.length - 1; i >= 0; i--) {
          scss_files.push(app.path_lib.relative(sass_dir,folder.sass__front_ninja[i].path));
          scss_paths.push(folder.sass__front_ninja[i].path);
        }
      }else if(!sub_folder.endsWith('__front_ninja')){
        app.get_sass_files(folder[sub_folder], scss_files, scss_paths, sass_dir);
      }
    }
  },

  /**
   * Sass watch
   *
   * Watch sass files with native sass command
   * Falls back to app.sassjs_watch() on error
   * Used by app.compile_sass()
   */
  sass_watch: function(scss_file, css_path, scss_paths, scss_files, sass_dir){
    app.log('command: sass --watch '+scss_file+':'+css_path);
    var sass_process = app.child_process.spawn('sass', ['--watch', scss_file+':'+css_path]);
    sass_process.on('error', function(error) {
      console.log(error);
      scss_paths.forEach(function(scss_path) {
        console.log('fallback to sassjs_watch');
        app.sassjs_watch(scss_file, css_path, scss_path, scss_files, sass_dir);
      });
    });
    sass_process.stdout.on('data', function(data) {
      var msg = `${data}`;
      if(msg.indexOf('error') >= 0){
        app.help('<b>Sass error:</b> '+msg, 'alert');
      }
      console.log(msg);
    });

    sass_process.stderr.on('data', function(data) {
      console.log(`stderr: ${data}`);
    });


    /*
    return;
    app.child_process.exec('sass --watch '+scss_file+':'+css_path, function(error, stdout, stderr){
      if(error){
        console.log(error);
        scss_paths.forEach(function(scss_path){
          console.log('fallback to sassjs_watch');
          app.sassjs_watch(scss_file, css_path, scss_path, scss_files, sass_dir);
        });
      }
    });
    */
  },

  /**
   * Sass.js watch
   *
   * Watch sass files with sass.js from app/js/sass/sass.js
   * Used by app.compile_sass()
   */
  sassjs_watch: function(scss_file, css_path, scss_path, scss_files, sass_dir){
    app.log('sassjs_watch');
    app.fs_lib.watch(scss_path, function(event, filename){
      console.log(filename);
      try{
        app.sass.preloadFiles(sass_dir, '', scss_files, function() {
          app.sass.compile('@import "'+app.path_lib.parse(scss_file).name+'";', function(result) {
            if(result.status == 0){
              app.fs_lib.writeFile(css_path, result.text, function(e){
                if(e) console.log(e);
              });
            }else{
              console.log(result);
            }
          });
        });
      }catch(e){
        console.log(e);
      }
    });
  },

  /**
   * Compile sass
   *
   * Watch sass files with sass.js from app/js/sass/sass.js
   * Used by app.compile_sass()
   */
  compile_sass: function(scss_path, $this) {
    console.clear();
    var css_path = $this.data('path');
    console.log('sass '+scss_path+' '+css_path);

    var scss_files = [];
    var scss_paths = [];

    var sass_dir = app.path_lib.dirname(scss_path) + app.path_lib.sep;

    app.get_sass_files(app.project_pages, scss_files, scss_paths, sass_dir);
    app.child_process.exec('sass -h', function(error, stdout, stderr){
      console.log(error);
      //console.log(stdout);
      //console.log(stderr);

      if(error){ 
        app.help(`Compiling ${scss_path} to ${css_path} with Sass.js library. <br>You can install sass locally for better performance from <b class="app_button" data-run="open" data-args="http://sass-lang.com/install">sass-lang.com</b>`);
        console.log(scss_paths);
        scss_paths.forEach(function(scss_path){
          console.log(scss_path);
          app.sassjs_watch(scss_path, css_path, scss_path, scss_files, sass_dir);
        });
      }else{
        app.help(`Compiling ${scss_path} to ${css_path}.`);
        app.sass_watch(scss_path, css_path, scss_paths, scss_files, sass_dir);
      }
      app.unselect_css_sass($('#pages .active .hidden'));
    });

  },

/*
     █████       ██  █████  ██   ██        ██        ███████  ██████   ██████ ██   ██ ███████ ████████ 
    ██   ██      ██ ██   ██  ██ ██         ██        ██      ██    ██ ██      ██  ██  ██         ██    
    ███████      ██ ███████   ███       ████████     ███████ ██    ██ ██      █████   █████      ██    
    ██   ██ ██   ██ ██   ██  ██ ██      ██  ██            ██ ██    ██ ██      ██  ██  ██         ██    
    ██   ██  █████  ██   ██ ██   ██     ██████       ███████  ██████   ██████ ██   ██ ███████    ██    
*/

  /**
   * Load template
   *
   * Loads a template by ajax to the elment passed as argument
   */
  load_template: function(args, $this){
    app.log('--> load_template: ',args);
    if(args.hasOwnProperty('project')){
      $('#selected_project').text(' - ' + args.project);
      $('.window').removeClass('home');
    }
    app.set_template_data(args,function(args) {
      $.get(app.projects_url + 'app/' + args.action + '.html', function(result){
        $(args.target).html(result);
      });
    });
  },

  /**
   * Set template data
   *
   * Makes available the data for handlebars renderer
   */
  set_template_data: function(args, callback) {
    app.log('--> set_template_data',app.template_data);
    switch(args.action) {
      case 'menu':
        app.template_data['app/menu'] = {
          theme_light: (app.options.theme == 'light'),
          native_window: app.package.window.frame,
          preview_projects: app.options.preview_projects,
          app_url: 'http://'+app.ip+':'+app.port + '/mobile/app.html'
        };
        callback(args);
      break;
      case 'main':
        app.template_data['app/main'] = {
          projects: app.projects,
          preview_projects: app.options.preview_projects
        };
        app.help('Select a project to start.');
        callback(args);
      break;
      case 'pages':
        app.get_inner_pages(args.project, function(){
          app.template_data['app/pages'] = {
            pages: app.project_pages
          };
          callback(args);
        });
      break;
      default:
        callback(args);
    }
  },

  /**
   * Get template data
   *
   * Returns the data for the current template from app.template_data filled by set_template_data()
   * Used by app.template_engine()
   */
  get_template_data: function(template) {
    app.log('--> get_template_data',template);
    var data = {
      global: {
        scripts: [],
        styles: []
      }
    };
    if (template in app.template_data) {
      for (var attr in app.template_data[template]) { 
        data[attr] = app.template_data[template][attr]; 
      }
    }
    return data;
  },

/*
    ███    ███  ██████  ██████  ██ ██      ███████ 
    ████  ████ ██    ██ ██   ██ ██ ██      ██      
    ██ ████ ██ ██    ██ ██████  ██ ██      █████   
    ██  ██  ██ ██    ██ ██   ██ ██ ██      ██      
    ██      ██  ██████  ██████  ██ ███████ ███████
*/

  /**
   * Register helpers
   *
   * Registers custom helpers for handlebars:
   *  - pages_list: Prints the list of pages in pages.html file
   *  - script: Prints a script tag avoiding repeated scripts, specially for partials dependencies
   * Used by app.template_engine()
   */
  mob: function(args, $this) {
    app.io.sockets.emit('mobile_project', args);
  },
/*
    ██   ██ ███████ ██      ██████  ███████ ██████  ███████ 
    ██   ██ ██      ██      ██   ██ ██      ██   ██ ██
    ███████ █████   ██      ██████  █████   ██████  ███████
    ██   ██ ██      ██      ██      ██      ██   ██      ██
    ██   ██ ███████ ███████ ██      ███████ ██   ██ ███████
*/

  /**
   * Register helpers
   *
   * Registers custom helpers for handlebars:
   *  - pages_list: Prints the list of pages in pages.html file
   *  - script: Prints a script tag avoiding repeated scripts, specially for partials dependencies
   * Used by app.template_engine()
   */
  register_helpers: function() {
    
    app.hbs_lib.handlebars.registerHelper("hbs_log", function(optionalValue) {

      if (optionalValue) {
        console.log("Value");
        console.log("====================");
        console.log(optionalValue);
      }else{
        console.log("Current Context");
        console.log("====================");
        console.log(this);
      }
    });

    app.hbs_lib.handlebars.registerHelper('pages_list', function(context, options) {
      var max = 1000;
      //console.log(context);
      var print_list = function(context) {
        max--;
        ret += '<ul>';
        for (var folder in context) {
          if (!folder.endsWith('__front_ninja')) {
            ret += "<li>" + options.fn(folder);
            if(max > 0) print_list(context[folder]); // recursive
            ret += "</li>";
          }else if (folder != 'parent__front_ninja'){
            for (var file in context[folder]) {
              ret += "<li>" + options.fn(context[folder][file]) + "</li>";
            }
          }
        }
        ret += "</ul>";
        return ret;
      };
      var ret = '';

      print_list(context);

      return ret;
    });

    app.hbs_lib.handlebars.registerHelper('script', function(options) {
      /**
       * script_data might be an object:
       * { 
       *  src: src/script.js,
       *  in_footer: default false
       * }
       * or a string: src/script.js
       */
      var script_data = {}; 
      var scripts = this.global.scripts;
      if(options.fn(this).indexOf('}') > 0){
        // If is a json add to scripts array and don't print it, will be printed on scripts injection on template_engine()
        try{
          script_data = JSON.parse(options.fn(this));
          if(!scripts.hasOwnProperty(script_data.src)) {
            scripts[script_data.src] = script_data;
          }
        }catch(e){
          console.log('Bad json string: ', options.fn(this));
          console.log(e);
          return '';
        }
      }else{
        // If is just the src print it and add to script as done
        var src = options.fn(this);
        if(!scripts.hasOwnProperty(src) || scripts[src] != 'done') {
          scripts[src] = 'done';
          return '<script type="text/javascript" src="'+src+'"></script>';
        }
      }
    });
  },

/*
    ██████   █████  ██████  ████████ ██  █████  ██      ███████ 
    ██   ██ ██   ██ ██   ██    ██    ██ ██   ██ ██      ██      
    ██████  ███████ ██████     ██    ██ ███████ ██      ███████ 
    ██      ██   ██ ██   ██    ██    ██ ██   ██ ██           ██ 
    ██      ██   ██ ██   ██    ██    ██ ██   ██ ███████ ███████ 
*/

  /**
   * Register partial
   *
   * Generates name for partial from file name and path and registers it.
   * Used by app.reload_partials()
   */
  registerPartial: function (next,filepath,directory) {
    //console.log(filepath);
    app.fs_lib.readFile(filepath, 'utf8', function(err, data) {

      if (err) {
        console.log(err);
      }else{
        var original_name = app.path_lib.relative(directory, filepath).slice(0, -5).replace(/\\/g, '/');
        var partial_name = original_name.replace(/[ -]/g, '_');

        app.partials[partial_name] = original_name;

        console.log('________>   ', partial_name);
        app.hbs_lib.handlebars.registerPartial(partial_name, data);

      }

      next(err); 

    });
  },

  /**
   * Reload partials
   *
   * Set watcher for partials so changes on them reload the content
   * Otherwise partials are stored in memory and don't change until server is restarted
   * Used by app.after_walk_files()
   */
  reload_partials: function(){
    app.log('--> reload_partials');

    for (var partial in app.hbs_lib.handlebars.partials) {
      /**
       * To watch only one project:
       *  if(!partial.startsWith('project_name'))continue;
       */
      (function(partial){
        var file_path = app.projects_folder + app.path_lib.sep + app.partials[partial] + '.html';
        file_path = app.path_lib.resolve(file_path).replace(/\//g, app.path_lib.sep);
        //console.log(file_path);
        //return;
        app.fs_lib.watch(file_path, function(event, filename){
          delete app.hbs_lib.handlebars.partials[partial];
          app.registerPartial(function(){}, file_path, app.projects_folder);
          app.log('Partial reloaded: ' + partial);
        });
      })(partial);
    } 
  },

/*
     █████  ██████  ██████      ██████   █████  ████████  █████  
    ██   ██ ██   ██ ██   ██     ██   ██ ██   ██    ██    ██   ██ 
    ███████ ██████  ██████      ██   ██ ███████    ██    ███████ 
    ██   ██ ██      ██          ██   ██ ██   ██    ██    ██   ██ 
    ██   ██ ██      ██          ██████  ██   ██    ██    ██   ██ 
*/

  /**
   * Get options
   *
   * Returns options json
   */
  load_options: function(){
    app.log('--> load_options');

    app.fs_lib.readFile(app.dirname + app.path_lib.sep + 'options.json', 'utf8', function(err, data) {
      if (err) {
        console.log(err);
      }else{
        app.options = JSON.parse(data);
        console.log(app.options);
      }
    });

    app.fs_lib.readFile(app.dirname + app.path_lib.sep + 'package.json', 'utf8', function(err, data) {
      if (err) {
        console.log(err);
      }else{
        app.package = JSON.parse(data);
        console.log(app.package);
      }
    });
  },
  
  /**
   * Get options
   *
   * Writes options json to file options.json
   */
  save_options: function(){

  },
  
  /**
   * Get projects
   *
   * Fills app.projects with a list of folders in app/projects
   * Used by app.template_engine()
   */
  get_projects: function(){
    app.log('--> get_projects');

    app.fs_lib.readdir(app.projects_folder, function(err, dirs) {
      for (var i = dirs.length - 1; i >= 0; i--) {
        (function(dir) {
          app.fs_lib.stat(app.projects_folder + app.path_lib.sep + dir, function(err, stats){
            if(err){
              console.log('error on ' + dir + ' stats: ' + err);
            }else if(stats.isDirectory()){
              app.fs_lib.readdir(app.projects_folder + app.path_lib.sep + dir, function(err, files){
                if (dir != 'app' && dir != 'mobile' && dir != 'exports' && dir != 'partials') {
                  var default_file = (files.indexOf('index.html') >= 0)?'index.html': false;
                  if(!default_file){
                    for (var i = files.length - 1; i >= 0; i--) {
                      if(files[i].endsWith('.html')){
                        default_file = files[i];
                        break;
                      }
                    }
                  }
                  app.projects.push({
                    project: dir,
                    is_app: dir.endsWith('_app')? ' is_app': '',
                    url: app.projects_url + dir + app.path_lib.sep + default_file,
                    files_ajax_data: JSON.stringify({
                      project: dir,
                      action: 'pages',
                      target: '#app'
                    }),
                    mob_ajax_data: JSON.stringify({
                      url: app.projects_url + dir + app.path_lib.sep + default_file,
                      base_url: app.projects_url + dir
                    })
                  });
                }
              });
            }
          });
        })(dirs[i]);
      }
      app.after_get_projects();
    });
  },

  /**
   * Get inner pages
   *
   * Fill app.project_pages with all html files inside project folder and subfolders
   * Used by set_template_data when in a pages request
   * @param project
   * @param callback
   */
  get_inner_pages: function(project, callback) {
    app.log('--> get_inner_pages');

    // Clear app.project_pages
    app.project_pages = {};
    
    var directory = app.projects_folder + app.path_lib.sep + project;

    console.log(directory);

    app.walk(directory).on('file', function(root, stat, next) {

      var file_type = false;

      if(stat.name.endsWith('.html')) {
        file_type = 'html__front_ninja';
      }else if(stat.name.endsWith('.css') && !stat.name.endsWith('.min.css')){
        file_type = 'css__front_ninja';
      }else if(stat.name.endsWith('.sass') || stat.name.endsWith('.scss')){
        file_type = 'sass__front_ninja';
      }else{

        // Go to next file if is not of accepted types
        return next(null);
      }

      var filepath = app.path_lib.join(root, stat.name);
      var folders = filepath.replace(directory + app.path_lib.sep, '' ).split(app.path_lib.sep);
      var url = 'http://'+app.ip+':'+app.port + filepath.replace(app.dirname, '');
      var file = folders.pop();

      var current_folder = app.project_pages;

      for (var i = 0; i < folders.length; i++) {
        if (!current_folder.hasOwnProperty(folders[i]) ) {
          current_folder[folders[i]] = {};
        }
        current_folder = current_folder[folders[i]];
      }

      if (!current_folder.hasOwnProperty(file_type) ) {
        current_folder[file_type] = [];
      }
      current_folder[file_type].push({
        name: file,
        path: filepath,
        url: url,
        mob_ajax_data: JSON.stringify({
          url: url,
          base_url: app.projects_url + app.path_lib.sep + project
        }),
        is_html: (file_type == 'html__front_ninja'),
        is_css: (file_type == 'css__front_ninja'),
        is_sass: (file_type == 'sass__front_ninja')
      });

      next(null);

    }).on('end', function(){ // After project files
      /* Add parent reference to an associative array
      var setParent = function(o){
        for(var p in o){
          if(!p.endsWith('__front_ninja')){
            if(!o[p].hasOwnProperty('parent__front_ninja')) o[p].parent__front_ninja = o;
            setParent(o[p]);
          }
        }
      }

      setParent(app.project_pages);
      */
      callback();

      console.log(app.project_pages);

    });
  },

/*
    ███████ ███████ ██████  ██    ██ ███████ ██████  
    ██      ██      ██   ██ ██    ██ ██      ██   ██ 
    ███████ █████   ██████  ██    ██ █████   ██████  
         ██ ██      ██   ██  ██  ██  ██      ██   ██ 
    ███████ ███████ ██   ██   ████   ███████ ██   ██ 
*/

  /**
   * Walk files
   *
   * Analizes all files and do actions for different file types:
   *  - html: register as partial
   *  - css: watch for changes for live_css
   *  - scss/sass: 
   * @param directory
   */
  walk_files: function (directory) {

    app.log('--> walk_files');

    console.log(directory);

    app.walk(directory,{
      followLinks: false, 
      //filters: ["demo","startbootstrap-sb-admin","project1","startbootstrap-bare","bootstrap_base"]
    }).on('file', function(root, stat, next) {

      var filepath = app.path_lib.join(root, stat.name);

      //console.log(filepath);

      if(stat.name.endsWith('.html')){

        app.registerPartial(next,filepath,directory);


      }else if(stat.name.endsWith('.css') && !stat.name.endsWith('.min.css')){
        
        app.live_css(next,filepath);


      }else if(stat.name.endsWith('.sass') || stat.name.endsWith('.scss')){
        next(null); 
      }else{
        next(null); 
      }

    }).on("directories", function (root, dirStatsArray, next) {
      //console.log(dirStatsArray);
      next();
    }).on("errors", function (root, nodeStatsArray, next) {
      console.log(nodeStatsArray);
      next();
    }).on('end', function(){ // After partials registered

      app.after_walk_files();

    });
  },

  /**
   * Template engine
   *
   * Setup handlebars with express and injects app's client scripts
   * Used by app.run_server()
   */
  template_engine: function(){
    app.log('--> template_engine');

    app.express.engine('html', app.hbs_lib.__express);

    app.express.set('views', app.projects_folder);

    app.express.set('partials', app.projects_folder);

    app.get_projects(); 

    app.register_helpers(); 

    app.walk_files(app.projects_folder);

    app.express.get('*.html', function(req, res){
      if(req.url.indexOf('mobile/app.html') != -1){
        console.log(req);
        res.render('..'+req.url);
        return;
      }
      var template = req.url.replace('/projects/','');
      if (template.startsWith('/exports/')) {
        console.log(template);
        res.render('..'+req.url);
        return;
      }
      var template_data = app.get_template_data(template.replace('.html',''));
      console.log(template.replace('.html',''));
      res.render(
        template, 
        template_data,
        function(err, html){
          if(err){
            var start = err.message.indexOf('The partial ');
            var end = err.message.indexOf(' could not be found');
            var partial_name = err.message.substring(start + 12, end);
            var file_path = app.path_lib.join(app.projects_folder, partial_name + '.html');
            console.log(err,file_path);


            app.fs_lib.exists(file_path,function(exists){
              if(exists){
                app.fs_lib.watch(file_path, function(event, filename){
                  delete app.hbs_lib.handlebars.partials[partial_name];
                  app.registerPartial(function(err){
                    if(err === null){
                      app.help('New partial registered: '+partial_name);
                      res.send('<script>location.reload()</script>');
                    }else{
                      app.help('Failed to register partial: '+partial_name);
                      res.send(err);
                    }
                  }, file_path, app.projects_folder);
                  app.log('Partial reloaded: ' + partial_name);
                });
              }
            });
            app.registerPartial(function(err){
              if(err === null){
                app.help('New partial registered: '+partial_name);
                res.send('<script>location.reload()</script>');
              }else{
                app.help('Failed to register partial: '+partial_name);
                res.send(err);
              }
            }, app.path_lib.join(app.projects_folder, partial_name + '.html'), app.projects_folder);
            //res.send(err);

          }else{
            // Inject scripts
            html = app.inject_scripts(html, template_data.global.scripts);
            // Inject styles
            //html = app.inject_styles(html, template_data.global.styles);

            res.send(html);
          }
        }
      );
    });
  },

  /**
   * Set ip
   *
   * Sets the local ip so its accessible from local net
   * Used by app.init()
   */
  set_ip: function() { // from https://gist.github.com/szalishchuk/9054346

    var ifaces = app.os_lib.networkInterfaces();
    // Local ip address that we're trying to calculate
    var address = 'localhost';

    // Iterate over interfaces ...
    for (var dev in ifaces) {

        // ... and find the one that matches the criteria
        var iface = ifaces[dev].filter(function(details) {
            return details.family === 'IPv4' && details.internal === false;
        });

        if(iface.length > 0) address = iface[0].address;
    }

    app.ip = address;
  },

  /**
   * Runserver
   *
   * Search a free port and start listening
   * Used by app.init()
   */
  run_server: function(){
    app.log('--> run_server');

    app.template_engine();

    // Ajax requests
    app.express.get('*ajax_req', function(req, res){
      app.help('<textarea >'+req.query.msg+'</textarea>');
      res.send('ok');
      //$('#help_content')[0].innerHTML += '<textarea>'+req.query+'</textarea>';
      //res.send('saludos desde el server :-)');
      //console.log('res: ',res);
    });

    app.portfinder.getPort(function (err, port) {
      
      if(err) {
        console.log(err);
      }else{

        app.port = port;

        app.projects_url = 'http://'+app.ip+':'+app.port + '/projects/';

        app.http.listen( app.port, function(){

          app.express.use( app.express_lib.static( app.dirname + app.path_lib.sep ) );

        });
        app.io.on( 'connection', function( socket ){

          socket.emit('news', { hello: 'world' });
          app.log('user connect');
        });
      }
    });

  },

  /**
   * Init
   *
   * Initiates app
   * Sets app properties and run server
   */
  init: function() {
    app.log('--> init');

    app.dirname = app.path_lib.resolve( app.path_lib.dirname() );

    app.projects_folder = app.dirname + app.path_lib.sep + 'projects';

    app.load_options();

    app.walk = app.walk_lib.walk;

    app.window = app.gui_lib.Window.get();

    app.window.x = 10;
    app.window.y = 50;
    app.window.show();

    app.express = app.express_lib();

    app.http = app.http_lib.Server( app.express );

    app.io = app.io_lib( app.http );

    app.ncp = app.ncp_lib.ncp;

    app.ncp.limit = 160;

    app.sass = new Sass();

    app.set_ip();

    app.run_server();
  },

  /**
   * Load
   *
   * Init HTML dependant functionality
   * Sets app properties and run server
   */
  load: function() {
    app.log('--> load');

    app.bind_buttons();

    app.dev_tools(); // only on SDK build (local linux)

    app.editor = ace.edit("editor");

    app.editor.$blockScrolling = Infinity; // Editor told me to do this

    app.resizers();
    //app.editor.setTheme("ace/theme/monokai");

    // TEMP 
    //return;
    app.fs_lib.watch(app.dirname + '/css/style.css', function(){
      var el = document.getElementById("style");
      el.setAttribute("href", el.href + '?a=' + Math.random());
    });
  }
};

/*
    ███████ ███    ██ ██████  
    ██      ████   ██ ██   ██ 
    █████   ██ ██  ██ ██   ██ 
    ██      ██  ██ ██ ██   ██ 
    ███████ ██   ████ ██████  
*/
window.onfocus = function() { 
  //focusTitlebars(true);
};

window.onblur = function() { 
  //focusTitlebars(false);
};

window.onload = function() {

  app.load();
  return;
  setTimeout(function(){
    app.window.show();
  },1000);
  //app.window.show();

  //app.window.enterFullscreen();
};


app.init_time = Date.now();
app.init();
    /*

    NOTAS SASS:

    - Necesita saber cual es el archivo/archivos principales a compilar y a donde van
    - tiene q wachear todos para detectar cambios
    - tiene q detectar sass incluidos en partials para compilarlos al cargar 

    */
/*
// Extend application menu for Mac OS
if (process.platform == "darwin") {
  var menu = new app.gui_lib.Menu({type: "menubar"});
  menu.createMacBuiltin && menu.createMacBuiltin(window.document.title);
  app.gui_lib.Window.get().menu = menu;
}
*/
