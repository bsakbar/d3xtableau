'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function() {
    // Use the jQuery document ready signal to know when everything has been initialized
    $(document).ready(function() {
        // Tell Tableau we'd like to initialize our extension
        tableau.extensions.initializeAsync().then(function() {
            // Fetch the saved sheet name from settings. This will be undefined if there isn't one configured yet
            const savedSheetName = tableau.extensions.settings.get('sheet');
            if (savedSheetName) {
                // We have a saved sheet name, show its selected marks
                loadSelectedMarks(savedSheetName);
            } else {
                // If there isn't a sheet saved in settings, show the dialog
                showChooseSheetDialog();
            }
            initializeButtons();
        });
    });

    /**
     * Shows the choose sheet UI. Once a sheet is selected, the data table for the sheet is shown
     */
    function showChooseSheetDialog() {
        // Clear out the existing list of sheets
        $('#choose_sheet_buttons').empty();

        // Set the dashboard's name in the title
        const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
        $('#choose_sheet_title').text(dashboardName);


        // The first step in choosing a sheet will be asking Tableau what sheets are available
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

        // Next, we loop through all of these worksheets and add buttons for each one
        worksheets.forEach(function(worksheet) {
            // Declare our new button which contains the sheet name
            const button = createButton(worksheet.name);

            // Create an event handler for when this button is clicked
            button.click(function() {
                // Get the worksheet name and save it to settings.
                filteredColumns = [];
                const worksheetName = worksheet.name;
                tableau.extensions.settings.set('sheet', worksheetName);
                tableau.extensions.settings.saveAsync().then(function() {
                    // Once the save has completed, close the dialog and show the data table for this worksheet
                    $('#choose_sheet_dialog').modal('toggle');
                    loadSelectedMarks(worksheetName);
                });
            });

            // Add our button to the list of worksheets to choose from
            $('#choose_sheet_buttons').append(button);
        });


        // Show the dialog
        $('#choose_sheet_dialog').modal('toggle');
    }



    function createButton(buttonTitle) {
        const button =
            $(`<button type='button' class='btn btn-default btn-block'>
      ${buttonTitle}
    </button>`);

        return button;
    }

    // This variable will save off the function we can call to unregister listening to marks-selected events
    let unregisterEventHandlerFunction;

    function loadSelectedMarks(worksheetName) {
        // Remove any existing event listeners
        if (unregisterEventHandlerFunction) {
            unregisterEventHandlerFunction();
        }

        // Get the worksheet object we want to get the selected marks for
        const worksheet = getSelectedSheet(worksheetName);

        // console.log(worksheet.parentDashboard.objects[0]);
        // console.log(worksheet);

        // Set our title to an appropriate value
        $('#selected_marks_title').text(worksheet.name);

        // Call to get the selected marks for our sheet
        worksheet.getSelectedMarksAsync().then(function(marks) {
            // Get .the first DataTable for our selected marks (usually there is just one)
            const worksheetData = marks.data[0];
            // console.log(worksheetData);

            // Map our data into the format which the data table component expects it
            const data = worksheetData.data.map(function(row, index) {
                const rowData = row.map(function(cell) {
                    return cell.formattedValue;
                });
                return rowData;

            });


            const columns = worksheetData.columns.map(function(column) {
                return {
                    title: column.fieldName
                };

            });

            console.log(columns);

            var dataArr = []
            let dataJson;
            let i
            // console.log(data.columns)
            data.map(d => {
              // console.log('I am d',d)
              dataJson = {};
              i=0;
              columns.map(c =>{
                dataJson[c.title] = d[i]; //1st column
                // console.log(c.title, d[i])
                i++
              })
                dataArr.push(dataJson);
            });

            drawDotChart(data);


            // Populate the data table with the rows and columns we just pulled out
            populateDataTable(data, columns);


        });

        // Add an event listener for the selection changed event on this sheet.
        unregisterEventHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, function(selectionEvent) {
            // When the selection changes, reload the data
            loadSelectedMarks(worksheetName);
        });


    }

    function populateDataTable(data, columns) {
        // Do some UI setup here: change the visible section and reinitialize the table
        $('#data_table_wrapper').empty();

        if (data.length > 0) {
            $('#no_data_message').css('display', 'none');
            $('#data_table_wrapper').append(`<table id='data_table' class='table table-striped table-bordered'></table>`);

            // Do some math to compute the height we want the data table to be
            var top = $('#data_table_wrapper')[0].getBoundingClientRect().top;
            var height = $(document).height() - top - 130;

            const headerCallback = function(thead, data) {
                const headers = $(thead).find('th');
                for (let i = 0; i < headers.length; i++) {
                    const header = $(headers[i]);
                    if (header.children().length === 0) {
                        const fieldName = header.text();
                        const button = $(`<a href='#'>${fieldName}</a>`);
                        button.click(function() {
                            filterByColumn(i, fieldName);
                        });

                        header.html(button);
                    }

                }
            };



            // Initialize our data table with what we just gathered
            $('#data_table').DataTable({
                data: data,
                columns: columns,
                autoWidth: false,
                deferRender: true,
                scroller: true,
                scrollY: true,
                scrollX: false,
                headerCallback: headerCallback,
                dom: "<'row'<'col-sm-6'i><'col-sm-6'f>><'row'<'col-sm-12'tr>>" // Do some custom styling
            });
        } else {
            // If we didn't get any rows back, there must be no marks selected
            $('#no_data_message').css('display', 'inline');
        }

    }



    function initializeButtons() {
        $('#show_choose_sheet_button').click(showChooseSheetDialog);
        $('#reset_filters_button').click(resetFilters);
    }

    // Save the columns we've applied filters to so we can reset them
    let filteredColumns = [];

    function filterByColumn(columnIndex, fieldName) {
        // Grab our column of data from the data table and filter out to just unique values
        const dataTable = $('#data_table').DataTable({
            retrieve: true
        });
        const column = dataTable.column(columnIndex);
        const columnDomain = column.data().toArray().filter(function(value, index, self) {
            return self.indexOf(value) === index;

        });


        const worksheet = getSelectedSheet(tableau.extensions.settings.get('sheet'));
        worksheet.applyFilterAsync(fieldName, columnDomain, tableau.FilterUpdateType.Replace);
        filteredColumns.push(fieldName);
        return false;
    }

    function resetFilters() {
        const worksheet = getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach(function(columnName) {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }

    function getSelectedSheet(worksheetName) {
        if (!worksheetName) {
            worksheetName = tableau.extensions.settings.get('sheet');
        }

        // Go through all the worksheets in the dashboard and find the one we want
        return tableau.extensions.dashboardContent.dashboard.worksheets.find(function(sheet) {
            return sheet.name === worksheetName;
        });

    }

    function drawDotChart(dataArr, column) {

      $('#wrapper').empty();
        const impression = d => d[4]
        const xAccessor = d => parseInt(d[8].replace(/\$/g, ''));
        const yAccessor = d => parseInt(d[4].replace(/,/g, ''));
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const b_size = d => parseInt(d[2].replace(/\$/g, ''));
        const average_y = d => Math.round(d3.mean(dataArr, yAccessor));
        const average_x = d => Math.round(d3.mean(dataArr, xAccessor));

        function color_ind(average_y){
          if (yAccessor <= average_y) {
            return "#c74a65"
          } else {
            return "#4a9bc7"
          }
        }


        // console.log()
        // const colorAccessor = d => parseInt(d[4].replace(/\$/g, ''))

        const width = d3.min([
            window.innerWidth* 0.8  ,
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



        // bubbles colors

        // const colorScale = d3.scaleLinear()
        //     .domain(d3.extent(dataArr, colorAccessor))
        //     .range(["#3771be", "#cf5976"])

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
            .domain(d3.extent(dataArr, xAccessor))
            .range([0, dimensions.boundedWidth])
            .nice()

        const yScale = d3.scaleLinear()
            .domain(d3.extent(dataArr, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()



        const b_sizze = d3.scaleLinear()
            .domain(d3.extent(dataArr, b_size))
            .range([20, 80])

            function x_gridlines() {
              return d3.axisBottom(xScale)
              .ticks(10)
            }

            function y_gridlines() {
              return d3.axisLeft(yScale)
              .ticks(5)
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



        // function color_ind(d) {
        //   if (d[4] < average_y) {
        //   return "red"
        // }
        //   else  {
        //     return "blue"
        //   }
        // }



        let dots = bounds.selectAll("circle")
            .data(dataArr)
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


                div.html("<b>" + d[0] +"</b>"  + "<br/>" + "Impressions: " + d[4] + "<br/>" + "Media Spend: " + d[2] + "<br/>" + "CPA: $" + Math.round(d[8]))
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
            // .ticks(5)
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
               .text(average_y)
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
             .text(average_x)
             .attr("fill", "black")
             .style("font-size", "12px")
             .attr("font-family", "Arial")





        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)
            .ticks(10, "$f")

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
