/*jshint multistr: true */
/*jshint esversion: 6 */
/*global $:false, jQuery:false */
/* jshint node: true */
/* jshint strict: false */


let hrrref = "";
let activeJob = null;
let actionType = null;
var activeServers = [];
var activeJobs = [];

$(document).ready(function () {
    pushChildServers();
    refreshJobs();
    activeTab("home");

    $("#save-yes").bind("click", function () {
        console.log(hrrref);
        if (hrrref !== "") {
            // Add the spinner to let them know we are loading
            $("#m-body").append("<div class=\"d-flex justify-content-center\"><div class=\"spinner-border\" role=\"status\">" +
                                "<span class=\"sr-only\">Loading...</span></div></div>");
            $.get(hrrref, function (data) {
                console.log(data.success);
                console.log("#jobId" + activeJob);
                if (data.success && data.mode === "abandon") {
                    $("#id" + activeJob).remove();
                    $("#message1 .alert-heading").html("Job was successfully abandoned");
                    $(MODEL_ID).modal("toggle");
                    $("#message1").removeClass("d-none");
                    setTimeout(
                        function () {
                            $("#message1").addClass("d-none");
                        },
                        5000
                    );
                }
            }, "json");
        }
    });
    $("#save-no").bind("click", function () {
        $(MODEL_ID).modal("toggle");
    });
    $(MODEL_ID).on("show.bs.modal", function (event) {
        const button = $(event.relatedTarget); // Button that triggered the modal
        actionType = button.data("type"); // Extract info from data-* attributes
        hrrref = button.data("href");
        activeJob = button.data("jobid");
        const modal = $(this);
        updateModal(modal);
    });
});

/**
 * Function to update the current progress
 * @param    {Class} job    current job
 * @param    {Class} oldJob    Copy of old job
 */
function updateProgress(job, oldJob) {
    const subProgressBar = `<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" 
                             aria-valuenow="${job.progress_round}" aria-valuemin="0" aria-valuemax="100" 
                             style="width: ${job.progress_round}%">
                             <small class="justify-content-center d-flex position-absolute w-100" style="color: black; z-index: 2;">
                             ${job.progress}%
                             </small></div></div>`;
    const mainProgressBar = `<div id="jobId${job.job_id}_stage"><b>Stage: </b>${job.stage}</div>
                             <div id="jobId${job.job_id}_progress" ><div class="progress">${subProgressBar}</div>
                             <div id="jobId${job.job_id}_eta"><b>ETA: </b>${job.eta}</div>`;
    const progressSection = $(`#jobId${job.job_id}_progress_section`);
    const stage = $(`#jobId${job.job_id}_stage`);
    const eta = $(`#jobId${job.job_id}_eta`);
    const progressBarDiv = $(`#jobId${job.job_id}_progress`)
    if (checkTranscodeStatus(job)) {
        // Catch if the progress section is empty and populate it
        if (progressSection[0].innerHTML === "" || !progressBarDiv.length) {
            progressSection[0].innerHTML = mainProgressBar;
        } else {
            if (job.progress_round !== oldJob.progress_round || job.progress !== oldJob.progress) {
                let el = progressBarDiv[0].querySelector('.progress-bar');
                if (el) {
                    el.style.width = `${job.progress_round}%`;
                    el.setAttribute('aria-valuenow', job.progress_round);
                    let small = el.querySelector('small');
                    if (small) small.innerText = `${job.progress}%`;
                } else {
                    progressBarDiv[0].innerHTML = `<div class="progress">${subProgressBar}`;
                }
            }
            updateContents(stage, job, "Stage", job.stage);
            updateContents(eta, job, "ETA", job.eta);
        }
    }
}

/**
 * Checks if current job needs a stage/progress bar added
 * This is enabled for music discs to enable current ripping track in job.stage
 * @param job current job object
 * @returns {boolean} True if job is transcoding or disc is an audio disc
 */
function checkTranscodeStatus(job) {
    let status = false;
    // HandBrake has the disc/files and should be outputting stage and eta
    if (job.status === "transcoding") {
        status = true;
    }
    // MakeMKV has the disc and should be outputting stage and eta
    if (job.status === "ripping" && job.stage !== "" && job.progress) {
        status = true;
    }
    // abcde is ripping the audio disc and is outputting stage and eta
    if (job.disctype === "music" && job.stage !== "") {
        status = true;
    }
    return status;
}

/**
 * Function to check and update the job values
 * @param {jQuery} item    Dom item to update
 * @param {Class} _job    Current job
 * @param {String} keyString    String that pairs with config item for display purposes
 * @param itemContents    item of job class to update
 */
function updateContents(item, _job, keyString, itemContents) {
    if (item[0] === undefined) {
        console.log(item)
        return false;
    }
    if (item[0].innerText.includes(itemContents)) {
        //console.log("nothing to do - values are current")
    } else {
        item[0].innerHTML = `<b> ${keyString}: </b>${itemContents}`;
        console.log(`${item[0].innerText} - <b>${keyString}: </b>${itemContents}`)
        console.log(item[0].innerText.includes(itemContents))
    }
    return true;
}

/**
 * Function that goes through the whole job card and updates outdated values
 * @param {Class} oldJob    Old job used to compare against fresh job from api
 * @param {Class} job     Fresh job pulled from api
 */
function updateJobItem(oldJob, job) {
    const cardHeader = $(`#jobId${job.job_id}_header`);
    const posterUrl = $(`#jobId${job.job_id}_poster_url`);
    const status = $(`#jobId${job.job_id}_status`);
    // Update card header ( Title (Year) )
    if (cardHeader[0].innerText !== `${job.title} (${job.year})`) {
        cardHeader[0].innerText = `${job.title} (${job.year})`;
    }
    // Update card poster image
    if (job.poster_url !== posterUrl[0].src && job.poster_url !== "None" && job.poster_url !== "N/A") {
        posterUrl[0].src = job.poster_url;
    }
    // Update job status image
    if (job.status !== status[0].title) {
        status[0].src = `static/img/${job.status}.png`;
        status[0].alt = job.status;
        status[0].title = job.status;
    }
    // Go through and update job values as needed
    updateContents($(`#jobId${job.job_id}_year`), job, "Year", job.year);
    updateContents($(`#jobId${job.job_id}_devpath`), job, "Device", job.devpath);
    updateContents($(`#jobId${job.job_id}_video_type`), job, "Type", job.video_type);
    updateProgress(job, oldJob);
    updateContents($(`#jobId${job.job_id}_RIPMETHOD`), job, "Rip Method", job.config.RIPMETHOD);
    updateContents($(`#jobId${job.job_id}_MAINFEATURE`), job, "Main Feature", job.config.MAINFEATURE);
    updateContents($(`#jobId${job.job_id}_MINLENGTH`), job, "Min Length", job.config.MINLENGTH);
    updateContents($(`#jobId${job.job_id}_MAXLENGTH`), job, "Max Length", job.config.MAXLENGTH);
}

/**
 * Removes a job from the card deck
 * @param {Class} job
 */
function removeJobItem(job) {
    $("#jobId" + job.job_id).remove();
}

/**
 * Function that runs after ajax request completes successfully
 * Will check for inactive jobs and then remove them
 * Then sorts the jobs in ascending order
 */
function refreshJobsComplete() {
    // Reset all jobs to inactive first, to detect jobs that are no longer present on any server
    $.each(activeJobs, function(index, job) {
        // Don't change jobs marked as active in checkActiveJobs
        if (job && !job.active_checked) {
            job.active = false;
        }
        // Reset the checked flag for the next refresh cycle
        if (job) {
            job.active_checked = false;
        }
    });
    
    // Create a new array to store jobs to be removed
    let jobsToRemove = [];
    
    // Loop through all active jobs and identify those to be removed
    $.each(activeJobs, function (index, job) {
        if (typeof (job) !== "undefined" && !job.active) {
            console.log("Job isn't active:" + job.job_id.split("_")[1]);
            // Instead of removing immediately, add to our removal list
            jobsToRemove.push(index);
        }
    });
    
    // Remove jobs in reverse order to avoid index shifting issues
    for (let i = jobsToRemove.length - 1; i >= 0; i--) {
        let index = jobsToRemove[i];
        removeJobItem(activeJobs[index]);
        activeJobs.splice(index, 1);
    }

    // Sort the visible job cards
    $("#joblist .col-md-4").sort(function (a, b) {
        if (a.id === b.id) {
            return 0;
        }
        return (a.id < b.id ? -1 : 1);
    }).each(function () {
        const elem = $(this);
        elem.remove();
        $(elem).appendTo("#joblist");
    });
}

/**
 * Function to check for active jobs from the return from api
 * Improved to better handle child servers
 * @param data returned data from ajax
 * @param serverIndex current server index count (added to the front of job id's)
 */
function checkActiveJobs(data, serverIndex) {
    // Get all job IDs from this server's response
    const currentServerJobIds = [];
    
    // Make sure data.results exists and is an array
    if (data && data.results && Array.isArray(data.results)) {
        // Collect all job IDs from this server
        $.each(data.results, function(_, job) {
            currentServerJobIds.push(`${serverIndex}_${job.job_id}`);
        });
    }
    
    // For each active job that belongs to this server, mark it active if it's still in the results
    $.each(activeJobs, function (AJIndex) {
        // Skip undefined jobs (might happen if jobs were removed)
        if (!activeJobs[AJIndex]) return;
        
        const jobIdParts = activeJobs[AJIndex].job_id.split('_');
        const jobServerIndex = jobIdParts[0];
        
        // Only check jobs from this server - leave other servers' jobs alone
        if (jobServerIndex === String(serverIndex)) {
            // Mark the job inactive initially
            activeJobs[AJIndex].active = false;
            
            // If we find this job in the current server's results, mark it active
            if (currentServerJobIds.indexOf(activeJobs[AJIndex].job_id) !== -1) {
                activeJobs[AJIndex].active = true;
            }
        }
    });
}

/**
 * Function that is run when data is received back from json api
 * @param data all data returned from the ajax request
 * @param serverIndex
 * @param serverUrl the url of the server the job is running on
 * @param serverCount
 * @returns {*}
 */
function refreshJobsSuccess(data, serverIndex, serverUrl, serverCount) {
    // Make sure data is valid and has results
    if (!data || !data.results || !Array.isArray(data.results)) {
        console.log("No valid data or results from server:", serverUrl);
        return serverCount;
    }
    
    checkActiveJobs(data, serverIndex);
    
    $.each(data.results, function (_index, job) {
        // Skip if job doesn't have an ID
        if (!job || !job.job_id) return;
        
        console.log(job.job_id);
        job.job_id = `${serverIndex}_${job.job_id}`;
        job.ripper = (data.arm_name ? data.arm_name : "");
        job.server_url = serverUrl;
        job.active = true;
        job.active_checked = true; // Mark as checked to prevent being marked inactive
        
        if (activeJobs.some(e => e && e.job_id === job.job_id)) {
            var oldJob = activeJobs.find(e => e && e.job_id === job.job_id);
            activeJobs[activeJobs.indexOf(oldJob)] = job;
            updateJobItem(oldJob, job);
        } else {
            activeJobs.push(job);
            $("#joblist").append(addJobItem(job, data.authenticated));
        }
        serverCount--;
    });
    return serverCount;
}

function checkNotifications(data) {
    $.each(data.notes, function (notifyIndex, note) {
        if ($(`#toast${note.id}`).length) {
            // Exists.
            console.log("element exists, skipping add");
        }else {
            console.log(note);
            addToast(note.title, note.message, note.id);
        }
    });
}

/**
 * Function set as an interval to update all jobs from api
 */
function refreshJobs() {
    let serverCount = activeServers.length;
    let completedRequests = 0;
    
    $.each(activeServers, function (serverIndex, serverUrl) {
        $.ajax({
            url: serverUrl + "/json?mode=joblist",
            type: "get",
            timeout: 2000,
            error: function () {
                completedRequests++;
                if (completedRequests === activeServers.length) {
                    refreshJobsComplete();
                }
            },
            success: function (data) {
                refreshJobsSuccess(data, serverIndex, serverUrl, serverCount);
                completedRequests++;
                
                if(typeof data !== 'undefined') {
                    checkNotifications(data);
                }
            },
            complete: function (data) {
                // Only run refreshJobsComplete once all servers have been queried
                if (completedRequests === activeServers.length) {
                    refreshJobsComplete();
                }
            }
        });
    });
}

/**
 * Function to push all child servers from arm.yaml config into links on the homepage
 */
function pushChildServers() {
    activeServers.push(location.origin);
    const childs = $("#children");
    const children = childs.text().trim();
    if (children) {
        const childLinks = [];
        const childrenArr = children.split(",");
        $.each(childrenArr, function (_index, value) {
            activeServers.push(value);
            childLinks.push(`<a target="_blank" href="${value}">${value}</a>`);
        });
        childs.html(`Children: <br />${childLinks.join("<br />")}`);
    }
}
