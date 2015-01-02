

/**
 * GET /
 * Home page.
 */

exports.index = function(req, res) {
  //var db = req.db;
  //var collection = db.get('sections');
  //collection.find({course : "CS_2110" },{},function(e,docs){

  res.render('home', {
    title: 'Home'//,
    //"sectionlist" : docs
    });
  //});
}
