'use strict';
(function() {

  let removeEventListener;
  let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync({ configure: showChooseSheetDialog }).then(function() {
          $('#reset_filters_button').click(resetFilters);
          const savedSheetName = "Display Partner Performance"
          if (savedSheetName) {
            loadSelectedMarks(savedSheetName);
          } else {
            showChooseSheetDialog();
          }
            // Since dataSource info is attached to the worksheet, we will perform
            // one async call per worksheet to get every dataSource used in this
            // dashboard.  This demonstrates the use of Promise.all to combine
            // promises together and wait for each of them to resolve.
            let dataSourceFetchPromises = [];

            // Maps dataSource id to dataSource so we can keep track of unique dataSources.
            let dashboardDataSources = {};

            // To get dataSource info, first get the dashboard.
            const dashboard = tableau.extensions.dashboardContent.dashboard;


            // Then loop through each worksheet and get its dataSources, save promise for later.
            dashboard.worksheets.forEach(function(worksheet) {
                dataSourceFetchPromises.push(worksheet.getDataSourcesAsync());
            });

            Promise.all(dataSourceFetchPromises).then(function(fetchResults) {
                fetchResults.forEach(function(dataSourcesForWorksheet) {
                    dataSourcesForWorksheet.forEach(function(dataSource) {
                        if (!dashboardDataSources[dataSource.id]) { // We've already seen it, skip it.
                            dashboardDataSources[dataSource.id] = dataSource;
                        }
                    });
                });




                buildDataSourcesTable(dashboardDataSources);

                var datasource = dashboardDataSources['federated.1cfcaj20zwyr8f1c3we6w0yu3sh4']
                var dataArr = []

                // console.log(datasource)
                datasource.getUnderlyingDataAsync().then(data => {
                    let dataJson;
                    // console.log(data.columns)
                    data.data.map(d => {
                      dataJson = {};
                      // dataJson['impressions'] = d[88].value; //1st column
                      // dataJson['cpa'] = d[71].value; //2nd column
                      // dataJson['partner'] = d[23].value; //3rd column
                      // dataJson['media_spend'] = d[79].value; //4th column
                        dataArr.push(dataJson);
                    });

                    // console.log(dataArr);

                    let sums = {};
                    let i;
                    for (i = 0; i < dataArr.length; i++){

                      var impressions = !isNaN(dataArr[i].impressions) ? dataArr[i].impressions : 0;
                      var media_spend = !isNaN(dataArr[i].media_spend) ? dataArr[i].media_spend : 0;
                      var cpa = !isNaN(dataArr[i].cpa) ? dataArr[i].cpa : 0;

                      if (dataArr[i].partner in sums){
                        sums[dataArr[i].partner]['impressions'] += impressions
                        sums[dataArr[i].partner]['cpa'] += cpa
                        sums[dataArr[i].partner]['media_spend'] += media_spend
                    } else {
                         sums[dataArr[i].partner] = {
                           "impressions": impressions,
                           "cpa": cpa,
                           "media_spend": media_spend,
                           "partner": dataArr[i].partner
                        }
                      }
                    }
                    // console.log(sums);

                    var sumsArr = []
                    for (const [key, value] of Object.entries(sums))
                      sumsArr.push(value)

                    // console.log(sumsArr)
                });

                // This just modifies the UI by removing the loading banner and showing the dataSources table.
                $('#loading').addClass('hidden');
                $('#dataSourcesTable').removeClass('hidden').addClass('show');
            });

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });

    function showChooseSheetDialog() {
    const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

    var worksheet = worksheets.find(function (sheet) {
      return sheet.name === "Display Partner Performance";

    });


    const worksheetNames = worksheets.map((worksheet) => {
      return worksheet.name;
    });

    demoHelpers.showDialog(dashboardName, worksheetNames, saveSheetAndLoadSelectedMarks);
  }



  function loadSelectedMarks(worksheetName) {
    if (removeEventListener) {
      removeEventListener();
    }

    const worksheet = demoHelpers.getSelectedSheet(worksheetName);


    // After getting the worksheet,
     // get the summary data for the sheet
     worksheet.getSummaryDataAsync().then(function (sumdata) {

      const worksheetData = sumdata;

      console.log(worksheetData)

      let newArr = [];
      let dataJson;
      worksheetData.data.map(d => {
        dataJson = {};
        dataJson['impressions'] = d[8].value; //1st column
        dataJson['cpa'] = d[2].value; //2nd column
        dataJson['partner'] = d[0].value; //3rd column
        dataJson['media_spend'] = d[6].value; //4th column
        dataJson['imp_average'] = d[7].value;
        dataJson['cpa_average'] = d[5].value;
          newArr.push(dataJson);
          // console.log(dataJson)
      });

      console.log(newArr);

      drawDotChart(newArr);

     });

    worksheet.getSelectedMarksAsync().then((marks) => {
        demoHelpers.populateDataTable(marks, filterByColumn);
    });

    const marksSelectedEventHandler = (event) => {
      loadSelectedMarks(worksheetName);
    }
    removeEventListener = worksheet.addEventListener(
      tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);
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
    function refreshDataSource(dataSource) {
        dataSource.refreshAsync().then(function() {
            console.log(dataSource.name + ': Refreshed Successfully');
        });
    }

    // Displays a modal dialog with more details about the given dataSource.
    function showModal(dataSource) {
        let modal = $('#infoModal');

        $('#nameDetail').text(dataSource.name);
        $('#idDetail').text(dataSource.id);
        $('#typeDetail').text((dataSource.isExtract) ? 'Extract' : 'Live');

        // Loop through every field in the dataSource and concat it to a string.
        let fieldNamesStr = '';
        dataSource.fields.forEach(function(field) {
            fieldNamesStr += field.name + ', ';
        });

        // Slice off the last ", " for formatting.
        $('#fieldsDetail').text(fieldNamesStr.slice(0, -2));

        dataSource.getConnectionSummariesAsync().then(function(connectionSummaries) {
            // Loop through each connection summary and list the connection's
            // name and type in the info field
            let connectionsStr = '';
            connectionSummaries.forEach(function(summary) {
                connectionsStr += summary.name + ': ' + summary.type + ', ';
            });

            // Slice of the last ", " for formatting.
            $('#connectionsDetail').text(connectionsStr.slice(0, -2));
        });

        dataSource.getLogicalTablesAsync().then(function(activeTables) {
            // Loop through each table that was used in creating this datasource
            let tableStr = '';
            activeTables.forEach(function(table) {
                tableStr += table.name + ', ';
            });

            // Slice of the last ", " for formatting.
            $('#activeTablesDetail').text(tableStr.slice(0, -2));
        });

        modal.modal('show');
    }

    // Constructs UI that displays all the dataSources in this dashboard
    // given a mapping from dataSourceId to dataSource objects.
    function buildDataSourcesTable(dataSources) {
        // Clear the table first.
        $('#dataSourcesTable > tbody tr').remove();
        const dataSourcesTable = $('#dataSourcesTable > tbody')[0];

        // Add an entry to the dataSources table for each dataSource.
        for (let dataSourceId in dataSources) {
            const dataSource = dataSources[dataSourceId];

            let newRow = dataSourcesTable.insertRow(dataSourcesTable.rows.length);
            let nameCell = newRow.insertCell(0);
            let refreshCell = newRow.insertCell(1);
            let infoCell = newRow.insertCell(2);

            let refreshButton = document.createElement('button');
            refreshButton.innerHTML = ('Refresh Now');
            refreshButton.type = 'button';
            refreshButton.className = 'btn btn-primary';
            refreshButton.addEventListener('click', function() {
                refreshDataSource(dataSource);
            });

            let infoSpan = document.createElement('span');
            infoSpan.className = 'glyphicon glyphicon-info-sign';
            infoSpan.addEventListener('click', function() {
                showModal(dataSource);
            });

            nameCell.innerHTML = dataSource.name;
            refreshCell.appendChild(refreshButton);
            infoCell.appendChild(infoSpan);
        }
    }

    function drawDotChart(arr) {

      $('#wrapper').empty();
        const partner = d=> d.partner
        const xAccessor = d => d.cpa
        const yAccessor =  d => d.impressions
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const b_size = d => d.media_spend
        // const average_y = d => d.imp_average
        // const average_y = d => d3.mean(arr, yAccessor)
        // const average_x = d => d.cpa_average
        // const average_x = d => d3.mean(arr, xAccessor)

        const average_y = d => Math.round(d3.mean(arr, yAccessor));
        const average_x = d => Math.round(d3.mean(arr, xAccessor));

        // const average_y = d => d3.sum(yAccessor) / d3.count(partner);
        // const average_x = d => d3.sum(xAccessor) / d3.count(partner);


        const width = d3.min([
            window.innerWidth * 0.9,
        ])

        const height = d3.min([
            window.innerHeight * 0.8,
        ])

        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 30,
                right: 50,
                bottom: 40,
                left: 100,
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
              return d3.axisBottom(xScale)
              .ticks(10)
            }

            function y_gridlines() {
              return d3.axisLeft(yScale)
              .ticks(20)
            }

            bounds.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")")
            .call(x_gridlines()
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
            )

            bounds.append("g")
                .attr("class", "grid")
                .call(y_gridlines()
                    .tickSize(-dimensions.boundedWidth)
                    .tickFormat("")
                )



        function color_ind(d){
          if (yAccessor(d) < average_y(d)) {
            return "#e15759"
          } else if (yAccessor(d) > average_y(d) && xAccessor(d) < average_x(d) ){
            return "#8ab562"
          } else {
            return "#4e79a7"
          };
        }



        let dots = bounds.selectAll("circle")
            .data(arr)
            .enter().append("circle")

        dots
            .transition()
            .duration(500)
            .attr("cx", d => xScale(xAccessor(d)))
            .attr("cy", d => yScale(yAccessor(d)))
            .attr("r", 0)
            .transition()
            .duration(700)
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
                    // .attr("fill", d => colorScale(colorAccessor(d)))
            });


        // axes


        // function ticks(){
        //   if (impression < 1e6){
        //     return k => `${k + "K"}`
        //   } else {
        //     return m => `${m}`
        //   }
        // };



        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(10)
            .tickFormat(add_commas);
            // .render()

        const yAxis = bounds.append("g")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "10")
            .attr("text-align","left")

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

          const avgLabel_y = bounds.append("text")
               .attr("y", d => yScale(average_y(d)) +15)
               .attr("x", 10)
               .text(d => add_commas(average_y(d)))
               .attr("fill", "black")
               .style("font-size", "12px")
               .attr("font-family", "Arial")

         const avgLabel_y_2 = bounds.append("text")
              .attr("y", d => yScale(average_y(d)) - 5)
              .attr("x", 10)
              .style("font-weight", "bold")
              .text("Avg Imp:")
              .attr("fill", "green")
              .style("font-size", "12px")
              .attr("font-family", "Arial")

         const avgLabel_x = bounds.append("text")
              .attr("x", d => xScale(average_x(d)) + 5)
              .attr("y", 10)
              .text("Avg CPA:")
              .attr("fill", "green")
              .style("font-size", "12px")
              .style("font-weight", "bold")
              .attr("font-family", "Arial")

        const avgLabel_x_2 = bounds.append("text")
             .attr("x", d => xScale(average_x(d)) + 5)
             .attr("y", 25)
             .text(d=>(add_commas(average_x(d))))
             .attr("fill", "black")
             .style("font-size", "12px")
             .attr("font-family", "Arial")




        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)
            .ticks(10,"$f")
            // .tickFormat(add_commas)

        const xAxis = bounds.append("g")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "10")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Cost per Action")
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


    // if (d[3].includes("Exceed")) return "#8ab562"
    // if (d[3].includes("Meet")) return "#4a9bc7"
    // if (d[3].includes ("Below")) return "#c74a65"

})();
