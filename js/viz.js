var margin = {top: 50, right: 150, bottom: 50, left: 150}, 
    width = window.innerWidth - margin.left - margin.right,
    height = window.innerHeight - margin.top - margin.bottom, 
    barPadding = 5;

var svg = d3.select("body")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// this second svg is used as a container for the legend
var svg2 = d3.select("body")
             .append("svg")
             .attr("class", "legend-svg")
             .attr("width", width + margin.left + margin.right)
             .attr("height", margin.bottom)
             .append("g")
             .attr("transform", "translate(" + margin.left + "," + 0 + ")");

// load the data and convert it from wide format to long format
d3.csv("earthquakes.csv")
  .then(function(wide_data) {
    var long_data = [];
    wide_data.forEach(function(row) {
      // loop through all of the columns, and for each column make a new row
      Object.keys(row).forEach(function(colname) {
      // ignore "States", "Value" and "Category" columns
        if (colname == "States" || colname == "Category") {
          return
        }
        long_data.push({"State": row["States"], "Year": colname, "Count": row[colname], "Category": row["Category"]})
      })
    })
    return long_data;
    /***d3.csv(d3.csv, "earthquakes.csv", function(wide_data) {
          var long_data = [];
          wide_data.forEach(function(row) {
            Object.keys(row).forEach(function(colname) {
              if (colname == "States" || colname == "Value" || colname == "Category") {
                return
              }
              long_data.push({"States": row["States"], "Year": colname, "Value": row[colname], "Category": row["Category"]})
              // a dictionary or an array of dictionaries?
            })
          })
        })
    ***/
  })
  .then(function(d) {
    var categories = d3.set(d, function(d) {return d.Category;}).values().sort();
    var years = d3.set(d, function(d) {return d.Year;}).values();
    var statesF = function(d) {
      var states = d3.set(d, function(d) {
        return d.State;
      }).values();
      return states;
    };

    // set up the x- and y-axes
    var yScale = d3.scaleBand()
                   .domain(years)
                   .range([0, height - margin.bottom])
                   .padding(0.05);

    var xScale = d3.scaleBand()
                   .range([0, width])
                   .padding(0.05);

    var yAxis = svg.append("g")
                   .attr("class", "y-axis")
                   .call(d3.axisLeft(yScale))
                   .style("font-size", "16px");

    var xAxisHandleForUpdate = svg.append("g")
                                  .attr("class", "x-axis")
                                  .attr("transform", "translate(0," + (height - margin.bottom) + ")")
                                  .style("font-size", "16px")
                                  .call(d3.axisBottom(xScale));

    // color schemes: the second one serves for the category with too many 0s
    var color_gradient = ["#fff5f0","#fee0d2","#fcbba1","#fc9272","#fb6a4a","#ef3b2c","#cb181d","#a50f15","#67000d"]

    var colorGradient = ["#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]

    // define the two event listeners for the mouseover effect
    var handleMouseOver = function(d) {
      svg.append("text")
         .attr("id", "mouseover-text")
         .attr("x", width/2)
         .attr("y", -margin.top/4)
         .style("text-anchor", "middle")
         .text(d.State + " " + d.Year + ": " + d.Count)
    }

    var handleMouseOut = function() {
      d3.select("#mouseover-text").remove();
    }

    // update the heatmap (both x-axis and the cells) according to the selected category
    var updateHM = function(d) {
      var sel_states = statesF(d);
      xScale.domain(sel_states);
      xAxisHandleForUpdate.call(d3.axisBottom(xScale));
      xAxisHandleForUpdate.selectAll("text")
                          .attr("transform", "rotate(-45)")
                          .style("text-anchor", "end");

    var sel_cat = d3.set(d, function(d) {return d.Category;}).values();

    if (sel_cat == categories[0]) {
      var colorScale = d3.scaleQuantile()
                         .domain(d3.extent(d, function(d) {return d.Count;}))
                         .range(color_gradient);
    } else if (sel_cat == categories[2]) {
      var sel_counts = d.map(function(d) {return d.Count;});
      var colorScale = d3.scaleQuantile()
                         .domain(sel_counts.filter(function(val) {return val != 0;}))
                         .range(colorGradient);
    } else {
      var sel_counts = d.map(function(d) {return d.Count;});
      var colorScale = d3.scaleQuantile()
                         .domain(sel_counts)
                         .range(color_gradient);
    }

    var cells = svg.selectAll("rect").data(d);

    cells.enter()
         .append("rect")
         .attr("x", function(d) {return xScale(d.State);})
         .attr("y", function(d) {return yScale(d.Year);})
         .attr("rx", 6)
         .attr("ry", 6)
         .attr("width", xScale.bandwidth())
         .attr("height", yScale.bandwidth())
         .style("fill", function(d) {
            if (d.Category == categories[2] && d.Count == 0) {
              return "#fff5f0";
            } else {
              return colorScale(d.Count);
            }
          })
         .on("mouseover", handleMouseOver)
         .on("mouseout", handleMouseOut)

    cells.transition()
         .attr("x", function(d) {return xScale(d.State);})
         .attr("width", xScale.bandwidth())
         .style("fill", function(d) {
            if (d.Category == categories[2] && d.Count == 0) {
              return "#fff5f0";
            } else {
              return colorScale(d.Count);
            }
          });

    cells.exit().remove();

    // update the legend according to the selected cateogory
    d3.select(".legend-svg").selectAll(".legend").remove();

    var legendData = svg2.selectAll(".legend").data(color_gradient);

    var legend = legendData.enter()
                           .append("g")
                           .attr("class", "legend")
                           .attr("transform", function (d, i) {
                              return "translate(" + (i+0.6)*((width - margin.left - margin.right)/d.length) + "," + margin.top/4 +")";
                            });

    legend.append("rect")
          .attr("fill", function(d) {return d;})
          .attr("width", width/10)
          .attr("height", margin.bottom/4);

    var legendText = legend.append("text")
                           .text(function(d) {
                              if (d == color_gradient[0]) {
                                return 0;
                              } else {
                                return Math.round(colorScale.invertExtent(d)[0]);
                              }
                            })
                           .attr("x", 0)
                           .attr("y", margin.bottom/2);

    legendText.transition()
              .text(function(d) {
                 if (d == color_gradient[0]) {
                   return 0;
                 } else {
                   return Math.round(colorScale.invertExtent(d)[0]);
                 }
               });
    };

    // define the select box event listener
    var dropdownChange = function() {
      var sel = d3.select(this).property("value"),
          sel_data = d.filter(function(d) {return d.Category == sel;});
      updateHM(sel_data);
    };

    // add the select box with the options
    var dropdown = d3.select("#dropdown-container")
                     .append("select")
                     .attr("class", "dropdown")
                     .on("change", dropdownChange);

    var options = dropdown.selectAll("option")
                          .data(categories)
                          .enter()
                          .append("option")
                          .text(function(d) {return d;})
                          .attr("value", function(d) {return d;});

    // set the default category as "0 to 9" when the page loads
    var defaultData = d.filter(function(d) {
      return d.Category == "0 to 9";
    });

    updateHM(defaultData);

    // add the x-axis title
    svg.append("text")
       .attr("x", (width - margin.left/3)/2)
       .attr("y", (height + margin.bottom))
       .attr("dx", "1em")
       .style("font-size", "24px")
       .style("text-anchor", "middle")
       .text("State");

    // add the y-axis title
    svg.append("text")
       .attr("transform", "rotate(-90)")
       .attr("x", -((height - margin.bottom)/2))
       .attr("y", -margin.left/1.5)
       .attr("dy", "1em")
       .style("font-size", "24px")
       .style("text-anchor", "middle")
       .text("Year");
  })