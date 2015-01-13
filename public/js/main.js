$(document).ready(function() {

  // Place JavaScript code here...
  var socket = io.connect(window.location.href);
  var the_interval = 20 * 1000

  
  socket.on('greet', function(data) {
    var current_course = "CS 2110";
    console.log(data);
    socket.emit('respond', {hello: "Connected very soothingly!"}, current_course)
  });
  

  socket.on('update_sections', function(sections){
    //console.log(sections);
    $("li").remove();//clearing out the field
    current_course = sections[0].course;
    for (index = 0; index < sections.length; index++) {
            console.log(sections[index]);
            if (sections[index].WL_capacity == "0") {
              if (sections[index].students_registered >= sections[index].total_capacity) {
                $('#sections').append($('<li style="color:#CC6666">').text(sections[index].course + " " + sections[index].students_registered + "/" + sections[index].total_capacity + " Section=" + sections[index].section + " CRN = " + sections[index].CRN));
              } else {
                $('#sections').append($('<li style="color:#66CC99">').text(sections[index].course + " " + sections[index].students_registered + "/" + sections[index].total_capacity + " Section=" + sections[index].section + " CRN = " + sections[index].CRN));             
              }
            }
            else {
              if ((sections[index].students_registered >= sections[index].total_capacity) && (sections[index].students_on_WL >= sections[index].WL_capacity)) {
                $('#sections').append($('<li style="color:#CC6666">').text(sections[index].course + " " + sections[index].students_registered + "/" + sections[index].total_capacity + " Section=" + sections[index].section + " Waitlist: " + sections[index].students_on_WL + "/" + sections[index].WL_capacity + " CRN = " + sections[index].CRN))
              } else if (sections[index].students_registered >= sections[index].total_capacity) {
                $('#sections').append($('<li style="color:#FFCC55">').text(sections[index].course + " " + sections[index].students_registered + "/" + sections[index].total_capacity + " Section=" + sections[index].section + " Waitlist: " + sections[index].students_on_WL + "/" + sections[index].WL_capacity + " CRN = " + sections[index].CRN))                
              } else {
                $('#sections').append($('<li style="color:#66CC99">').text(sections[index].course + " " + sections[index].students_registered + "/" + sections[index].total_capacity + " Section=" + sections[index].section +  " Waitlist: " + sections[index].students_on_WL + "/" + sections[index].WL_capacity + " CRN = " + sections[index].CRN))                
              }
            }
    }

  })



  $('#update_sections_button').on('click', function() {
    //console.log("updating from button");
    var course_name = $('#update_sections_text').val().toUpperCase();
    console.log(course_name);
    if (course_name != "") socket.emit('find_sections', course_name);//letting the server know
    else socket.emit('update_sections', current_course)
  });

  $('#update_sections_text').on('change', function() {
    //console.log("updating from button");
    var course_name = $('#update_sections_text').val().toUpperCase();
    console.log(course_name);
    if (course_name != "") socket.emit('find_sections', course_name);//letting the server know
    else socket.emit('update_sections', current_course)
  });

  setInterval(function() {
    console.log("20 second update");
    var course_name = $('#update_sections_text').val().toUpperCase();
    console.log(course_name);
    if (course_name != "") socket.emit('find_sections', course_name);//letting the server know
    else socket.emit('update_sections', current_course)
  }, the_interval);
    
  $('#confirmPhoneModal').on('click', function() {
    var phone_num = $('#phone-num').val();
    var CRN_rawlist = $('#CRN-list').val();
    $('#phoneModal').modal('hide');
    socket.emit("add_CRN", phone_num, CRN_rawlist)
  });

  socket.on('wrong_phone', function() {
    $('#wrongPhoneModal').modal('show')
  })

  socket.on('wrong_CRN', function() {
    $('#wrongCRNModal').modal('show')
  })

  socket.on('added_CRN', function() {
    $('#successModal').modal('show')
  })
})