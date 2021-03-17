'use strict';
(function() {

  let removeEventListener;
  let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
          $('#reset_filters_button').click(resetFilters);
          const savedSheetName = "D3 DATA"
          loadSelectedMarks(savedSheetName);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


  function loadSelectedMarks(worksheetName) {
    if (removeEventListener) {
      removeEventListener();
    }

     const worksheet = demoHelpers.getSelectedSheet(worksheetName);
     const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

     // for (let i=0; i < worksheets.length; i++){
       worksheet.getSummaryDataAsync().then(function (sumdata) {
        const worksheetData = sumdata;
        console.log(worksheetData)

        let newArr = [];
        let dataJson;
        worksheetData.data.map(d => {
          dataJson = {};
          dataJson['impressions'] = d[9].value; //1st column
          dataJson['cpa'] = d[4].value; //2nd column
          dataJson['partner'] = d[0].value; //3rd column
          dataJson['media_spend'] = d[7].value; //4th column
          dataJson['campaign'] = d[1].value;
          dataJson['imp_average'] = d[8].value;
          dataJson['cpa_average'] = d[6].value;
            newArr.push(dataJson);
        });
        console.log(newArr);

        if (document.querySelector('input[name="choice"]')) {
          document.querySelectorAll('input[name="choice"]').forEach((elem) => {
            elem.addEventListener("change", function() {
              var radio_partner = document.getElementById("radio_partner");
              var radio_campaign = document.getElementById("radio_campaign");
              if (radio_partner.checked == true ){
                partner_radio(newArr)
              } else if (radio_campaign.checked == true ){
                campaign_radio(newArr)
              }
            });
          });
        }

        partner_radio(newArr)



      function partner_radio(newArr){
        let sums = {};
        let i;
        for (i = 0; i < newArr.length; i++){

          var impressions = !isNaN(newArr[i].impressions) ? newArr[i].impressions : 0;
          var media_spend = !isNaN(newArr[i].media_spend) ? newArr[i].media_spend : 0;
          var cpa = !isNaN(newArr[i].cpa) ? newArr[i].cpa : 0;

          if (newArr[i].partner in sums){
            sums[newArr[i].partner]['impressions'] += impressions
            sums[newArr[i].partner]['cpa'] += cpa
            sums[newArr[i].partner]['media_spend'] += media_spend
        } else {
             sums[newArr[i].partner] = {
               "impressions": impressions,
               "cpa": cpa,
               "media_spend": media_spend,
               "partner": newArr[i].partner
            }
          }
        }
        var sumsArr = []
        for (const [key, value] of Object.entries(sums))
          sumsArr.push(value)

        drawDotChart(sumsArr);
      }

      function campaign_radio(newArr){
        let sums = {};
        let i;
        for (i = 0; i < newArr.length; i++){

          var impressions = !isNaN(newArr[i].impressions) ? newArr[i].impressions : 0;
          var media_spend = !isNaN(newArr[i].media_spend) ? newArr[i].media_spend : 0;
          var cpa = !isNaN(newArr[i].cpa) ? newArr[i].cpa : 0;

          if (newArr[i].campaign in sums){
            sums[newArr[i].campaign]['impressions'] += impressions
            sums[newArr[i].campaign]['cpa'] += cpa
            sums[newArr[i].campaign]['media_spend'] += media_spend
        } else {
             sums[newArr[i].campaign] = {
               "impressions": impressions,
               "cpa": cpa,
               "media_spend": media_spend,
               "partner": newArr[i].campaign
            }
          }
        }

        var sumsArr = []
        for (const [key, value] of Object.entries(sums))
          sumsArr.push(value)

        drawDotChart(sumsArr);
      }

       });


    worksheet.getSelectedMarksAsync().then((marks) => {
        demoHelpers.populateDataTable(marks, filterByColumn);
    });

    const marksSelectedEventHandler = (event) => {
      loadSelectedMarks(worksheetName);
    }
    removeEventListener = worksheet.addEventListener(
      tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
  }

  function saveSheetAndLoadSelectedMarks(worksheetName) {
    tableau.extensions.settings.set('sheet', worksheetName);
    tableau.extensions.settings.saveAsync();
    loadSelectedMarks(worksheetName);
  }

  function filterByColumn(columnIndex, fieldName) {
    const columnValues = demoHelpers.getValuesInColumn(columnIndex);
    const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));

    worksheet.applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

    filteredColumns.push(fieldName);
  }

  function resetFilters() {
    const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
    filteredColumns.forEach((columnName) => {
        worksheet.clearFilterAsync(columnName);
    });

    filteredColumns = [];
  }

    // Refreshes the given dataSource.
    // function refreshDataSource(dataSource) {
    //     dataSource.refreshAsync().then(function() {
    //         console.log(dataSource.name + ': Refreshed Successfully');
    //     });
    // }

    // Displays a modal dialog with more details about the given dataSource.
    // function showModal(dataSource) {
    //     let modal = $('#infoModal');
    //
    //     $('#nameDetail').text(dataSource.name);
    //     $('#idDetail').text(dataSource.id);
    //     $('#typeDetail').text((dataSource.isExtract) ? 'Extract' : 'Live');
    //
    //     // Loop through every field in the dataSource and concat it to a string.
    //     let fieldNamesStr = '';
    //     dataSource.fields.forEach(function(field) {
    //         fieldNamesStr += field.name + ', ';
    //     });
    //
    //     // Slice off the last ", " for formatting.
    //     $('#fieldsDetail').text(fieldNamesStr.slice(0, -2));
    //
    //     dataSource.getConnectionSummariesAsync().then(function(connectionSummaries) {
    //         // Loop through each connection summary and list the connection's
    //         // name and type in the info field
    //         let connectionsStr = '';
    //         connectionSummaries.forEach(function(summary) {
    //             connectionsStr += summary.name + ': ' + summary.type + ', ';
    //         });
    //
    //         // Slice of the last ", " for formatting.
    //         $('#connectionsDetail').text(connectionsStr.slice(0, -2));
    //     });
    //
    //     dataSource.getLogicalTablesAsync().then(function(activeTables) {
    //         // Loop through each table that was used in creating this datasource
    //         let tableStr = '';
    //         activeTables.forEach(function(table) {
    //             tableStr += table.name + ', ';
    //         });
    //
    //         // Slice of the last ", " for formatting.
    //         $('#activeTablesDetail').text(tableStr.slice(0, -2));
    //     });
    //
    //     modal.modal('show');
    // }

    // Constructs UI that displays all the dataSources in this dashboard
    // given a mapping from dataSourceId to dataSource objects.
    // function buildDataSourcesTable(dataSources) {
    //     // Clear the table first.
    //     $('#dataSourcesTable > tbody tr').remove();
    //     const dataSourcesTable = $('#dataSourcesTable > tbody')[0];
    //
    //     // Add an entry to the dataSources table for each dataSource.
    //     for (let dataSourceId in dataSources) {
    //         const dataSource = dataSources[dataSourceId];
    //
    //         let newRow = dataSourcesTable.insertRow(dataSourcesTable.rows.length);
    //         let nameCell = newRow.insertCell(0);
    //         let refreshCell = newRow.insertCell(1);
    //         let infoCell = newRow.insertCell(2);
    //
    //         let refreshButton = document.createElement('button');
    //         refreshButton.innerHTML = ('Refresh Now');
    //         refreshButton.type = 'button';
    //         refreshButton.className = 'btn btn-primary';
    //         refreshButton.addEventListener('click', function() {
    //             refreshDataSource(dataSource);
    //         });
    //
    //
    //         let infoSpan = document.createElement('span');
    //         infoSpan.className = 'glyphicon glyphicon-info-sign';
    //         infoSpan.addEventListener('click', function() {
    //             showModal(dataSource);
    //         });
    //
    //         nameCell.innerHTML = dataSource.name;
    //         refreshCell.appendChild(refreshButton);
    //         infoCell.appendChild(infoSpan);
    //     }
    // }

    function drawDotChart(arr) {
      $('#wrapper').empty();
        const partner = d => d.partner
        const campaign = d => d.campaign
        const xAccessor = d => d.cpa
        const yAccessor =  d => d.impressions
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const b_size = d => d.media_spend
        const average_y = d => Math.round(d3.mean(arr, yAccessor));
        const average_x = d => d3.mean(arr, xAccessor);
        const remove_zero = d => (d / 1e6) + "M";
        const add_sign = d => "$" + add_commas(d);


        const width = d3.min([
            window.innerWidth  ,
        ])
        const height = d3.min([
            window.innerHeight * 0.8,
        ])
        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 10,
                right: 50,
                bottom: 30,
                left:50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)

        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        bounds.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", dimensions.boundedWidth)
        .attr("height", dimensions.boundedHeight);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(arr, xAccessor))
            .range([0, dimensions.boundedWidth])
            .nice()

        const yScale = d3.scaleLinear()
            .domain(d3.extent(arr, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()

        const b_sizze = d3.scaleLinear()
            .domain(d3.extent(arr, b_size))
            .range([10, 60])

            function x_gridlines() {
              return d3.axisBottom()
              .scale(xScale)
              .ticks(10)
            }

            function y_gridlines() {
              return d3.axisLeft()
              .scale(yScale)
              .ticks(10)
            }





            const yAxisGenerator = d3.axisLeft()
                .scale(yScale)
                .ticks(6)
                .tickSize(-dimensions.boundedWidth)
                .tickFormat("")
                .tickFormat(remove_zero);

            const yAxis = bounds.append("g")

                .attr('id', "axis-y")
                .attr("font-family", "Arial")
                .attr("font-size", "8")
                .attr("text-align","left")

            const xAxisGenerator = d3.axisBottom()
                .scale(xScale)
                .ticks(5)
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
                .tickFormat(add_sign)

            const xAxis = bounds.append("g")
                .attr("class","axisLine")
                .attr('id', "axis-x")
                .style("transform", `translateY(${
            dimensions.boundedHeight
          }px)`)
                .attr("font-family", "Arial")
                .attr("font-size", "8")


            var gx = bounds.append("g")
            .call(xAxisGenerator)
            .attr("class","axisLine")

            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")");


            var gy = bounds.append("g")
            .call(yAxisGenerator)
            .attr("class","axisLine")

            .attr("font-family", "Arial")
            .attr("font-size", "8");

            // bounds.append("g")
            //     .attr("class", "grid")
            //     .call(y_gridlines()
            //         .tickSize(-dimensions.boundedWidth)
            //         .tickFormat("")
            //     )
            //
            //     bounds.append("g")
            //         .attr("class", "grid")
            //         .call(x_gridlines()
            //             .tickSize(-dimensions.boundedWidth)
            //             .tickFormat("")
            //         )



        function color_ind(d){
          if (yAccessor(d) < average_y(d)) {
            return "#e15759"
          } else if (yAccessor(d) >= average_y(d) && xAccessor(d) <= average_x(d) ){
            return "#8ab562"
          } else {
            return "#4e79a7"
          };
        }

        var dots_g = wrapper.append("g")
        .attr('transform', 'translate(' + dimensions.margin.left + ',' + dimensions.margin.top + ')')
        .attr("clip-path", "url(#clip)")
        .classed("dots_g", true);



        var zoom = d3.zoom()
        .scaleExtent([.5, 10])
        .extent([[0, 0], [dimensions.boundedWidth, dimensions.boundedHeight]])
        .on("zoom", zoomed);

        bounds.append("rect")
        .attr("width", dimensions.boundedWidth)
        .attr("height", dimensions.boundedHeight)
        .style("fill", "none")
        .style("stroke","none")
        .style("pointer-events", "all")
        // .attr('transform', 'translate(' + dimensions.margin.left + ',' + dimensions.margin.top + ')')
        .call(zoom);

        function zoomed() {
          var new_xScale = d3.event.transform.rescaleX(xScale);
          var new_yScale = d3.event.transform.rescaleY(yScale);

          gx
          .call(xAxisGenerator.scale(new_xScale))
          .attr("font-family", "Arial")
          .attr("font-size", "8");

          gy
          .call(yAxisGenerator.scale(new_yScale))
          .attr("font-family", "Arial")
          .attr("font-size", "8");


          dots
          .data(arr)
          .attr('cx', function(d) {return new_xScale(xAccessor(d))})
          .attr('cy', function(d) {return new_yScale(yAccessor(d))});
      }

      let dots = dots_g.selectAll("circle")
          .data(arr)
          .enter().append("circle")

      dots
          .transition()
          .duration(500)
          .attr("cx", d => xScale(xAccessor(d)))
          .attr("cy", d => yScale(yAccessor(d)))
          .attr("r", 0)
          .transition()
          .duration(900)
          .attr("r", d => b_sizze(b_size(d))/3)
          // .attr("r", 10)

          .attr("fill", color_ind)
          .style("opacity", .9)
          .style("mix-blend-mode", "multiply");


      dots.on("mouseover", function(d) {
              div.transition()
                  .duration(200)
                  .style("opacity", .9)
              d3.select(this)
                  .style("opacity", .6)
                  // .attr("fill", d => colorScale(colorAccessor(d)))
                  .attr("fill", color_ind)


              div.html(d.partner + "<br/>" + "Impressions: " + add_commas(d.impressions) + "<br/>" + "Media Spend: $" + add_commas(Math.round(d.media_spend)) + "<br/>" + "CPA: $" + add_commas(Math.round(d.cpa)))
                      .style("left", (d3.event.pageX) + "px")
                      .style("top", (d3.event.pageY - 28) + "px");
          })

          .on("mouseout", function(d) {
              div.transition()
                  .duration(200)
                  .style("opacity", 0);
              d3.select(this)
                  .style("opacity", 1)
                  .attr("fill", color_ind)
          });



        // average line

        const avgLine_y = bounds.append("line")
              .attr("y1", d => yScale(average_y(d)))
              .attr("y2", d => yScale(average_y(d)))
              .attr("x1", 0)
              .attr("x2", dimensions.boundedWidth)
              .attr("stroke", "green")
              .attr("stroke-dasharray", "3px 3px")

        const avgLine_x = bounds.append("line")
              .attr("x1", d => xScale(average_x(d)))
              .attr("x2", d => xScale(average_x(d)))
              .attr("y1", 0)
              .attr("y2", dimensions.boundedHeight)
              .attr("stroke", "green")
              .attr("stroke-dasharray", "3px 3px")

         const avgLabel_x = bounds.append("text")
              .attr("x", d => xScale(average_x(d)) + 5)
              .attr("y", 10)
              .text("Avg CPA:")
              .attr("fill", "green")
              .style("font-size", "10px")
              .style("font-weight", "bold")
              .attr("font-family", "Arial")


         var roundNo = d3.format("$.1f");
         const avgLabel_x_2 = bounds
               .append("g")

               avgLabel_x_2
               .selectAll("text")
               .data(arr)
               .enter()
               .append("text")
               .text( d => average_x(d))
               .attr("x", d => xScale(average_x(d)) + 5)
               .attr("y", 25)
               .attr("opacity", 0)
              .style("font-size", "10px")
              .attr("font-family", "Arial")
               .attr("fill","#1B2326")
                 .transition()
                 .duration(1500)
                 .delay(300)
               .attr("opacity", .6)
               .tween("text", function(d) {
                 var i = d3.interpolate(0, average_x(d));
                 return function(t) {
                   d3.select(this).text(roundNo(i(t)));
                 };
               });

               const avgLabel_y = bounds.append("text")
                    .attr("y", d => yScale(average_y(d)) - 5)
                    .attr("x", 10)
                    .style("font-weight", "bold")
                    .text("Avg Imp:")
                    .attr("fill", "green")
                    .style("font-size", "10px")
                    .attr("font-family", "Arial")

              var roundNo_2 = d3.format(".2s");

              const avgLabel_y_2 = bounds
                    .append("g")

                    avgLabel_y_2
                    .selectAll("text")
                    .data(arr)
                    .enter()
                    .append("text")
                    .text( d => average_y(d))
                    .attr("y", d => yScale(average_y(d)) + 10)
                    .attr("x", 10)
                    .attr("opacity", 0)
                   .style("font-size", "10px")
                   .attr("font-family", "Arial")
                    .attr("fill","#1B2326")
                      .transition()
                      .duration(1500)
                      .delay(300)
                    .attr("opacity", .6)
                    .tween("text", function(d) {
                      var i = d3.interpolate(0, average_y(d));
                      return function(t) {
                        d3.select(this).text(roundNo_2(i(t)));
                      };
                    });


        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2 -15)
            .attr("y", dimensions.margin.bottom -10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("CPA")
            .attr("fill", "black")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "black")

    }

})();
