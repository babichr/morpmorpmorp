//product_name
//product_price
// breadcrumbs
var tr = require('tor-request');

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var parseString = require('xml2js').parseString;
var htmlToJson = require('html-to-json');
var json2xls = require('json2xls');

app.use(json2xls.middleware);

app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.render('index');
});

var options = {};

app.get('/parse', function(res, req) {
  res.render('error');
  res.end();
});

app.post('/parse', function(req, res) {
  req.setTimeout(0);
  tr.request(
    {
      url: req.body.url + '/sitemap.xml',
    },
    function(err, response, body) {
      if (err) {
        res.render('error', { error: err });
        res.end();
      }
      parseString(body, function(error, result) {
        var bodyArr = [];
        var promiseArray = [];

        if (error) {
          res.render('error', { error: error });
          res.end();
        }
        if (result) {
          result.urlset.url.forEach(function(element, index) {
            if (element.loc[0].includes(req.body.url + '/p')) {
              // parse start

              promiseArray.push(
                new Promise(function(resolve, reject) {
                  setTimeout(function() {
                    tr.request(
                      {
                        url: element.loc[0],
                        headers: {
                          'User-Agent':
                            'Googlebot/2.1 (+http://www.googlebot.com/bot.html)',
                          referer: 'https://www.google.com',
                        },
                      },
                      function(locErr, locRes, locBody) {
                        //Parse html product page
                        console.log(new Date(), index, 100 * index);
                        if (locBody || locRes) {
                          htmlToJson.parse(
                            locBody.toString(),
                            {
                              name: function(page) {
                                return page
                                  .find('[data-qaid="product_name"]')
                                  .text();
                              },
                              price: function(page) {
                                return page
                                  .find('[data-qaid="product_price"]')
                                  .text();
                              },
                              description: function(page) {
                                return page
                                  .find('[data-qaid="product_description"]')
                                  .text();
                              },
                              htmlTitle: function(page) {
                                return page.find('title').text();
                              },
                              htmlDesc: function(page) {
                                return page
                                  .find('[data-qaid="description"]')
                                  .attr('content');
                              },
                              wholesale_price: function(page) {
                                return page
                                  .find('[data-qaid="wholesale_price"]')
                                  .text();
                              },
                              productCode: function(page) {
                                return page
                                  .find('[data-qaid="product_code"]')
                                  .text();
                              },
                              presence_data: function(page) {
                                return page
                                  .find('[data-qaid="presence_data"]')
                                  .text();
                              },
                              image: function(page) {
                                return page
                                  .find(
                                    '[data-qaid="img_product_sticky_panel"]',
                                  )
                                  .attr('src');
                              },
                              id: function(page) {
                                return page
                                  .find('[data-edit-role="productInfo"]')
                                  .attr('data-edit-id');
                              },
                              breadCrumbs: function(page) {
                                if (
                                  page
                                    .find('[data-extend="Breadcrumbs"]')
                                    .attr('data-crumbs-path')
                                ) {
                                  return JSON.parse(
                                    page
                                      .find('[data-extend="Breadcrumbs"]')
                                      .attr('data-crumbs-path'),
                                  )
                                    .map(item =>
                                      item && item.name
                                        ? unescape(item.name)
                                        : '',
                                    )
                                    .join(',');
                                } else {
                                  return '';
                                }
                              },
                              category: function(page) {
                                if (
                                  page
                                    .find('[data-extend="Breadcrumbs"]')
                                    .attr('data-crumbs-path')
                                ) {
                                  return JSON.parse(
                                    page
                                      .find('[data-extend="Breadcrumbs"]')
                                      .attr('data-crumbs-path'),
                                  )[
                                    JSON.parse(
                                      page
                                        .find('[data-extend="Breadcrumbs"]')
                                        .attr('data-crumbs-path'),
                                    ).length - 2
                                  ].name;
                                } else {
                                  return '';
                                }
                              },

                              htmlKeywords: function(page) {
                                return page
                                  .find('[data-qaid="keywords"]')
                                  .attr('content');
                              },
                            },
                            function(htmlError, res) {
                              resolve(res);

                              if (res.htmlTitle !== 'Защита от роботов') {
                                // bodyArr.push(res);
                                console.log('resolve', index);
                                // resolve(res);
                              } else {
                                reject(index);
                                console.log('reject', index);
                              }
                            },
                          );
                        }
                      },
                    );
                  }, 2000 * index);
                }),
              );

              //parse end
            }
          });
        }

        Promise.all(promiseArray)
          .then(function(values) {
            console.log('values', values);

            res.xls(req.body.url + '.xls', values);
            res.end();
          })
          .catch(function(error) {
            console.log('error', error);
            res.end();
          });

        // json2xls(bodyArr)

        // res.xls('data.xlsx', bodyArr);
      });
    },
  );
});

app.listen(8081, function() {
  console.log('Example app listening on port 8081!');
});
