var axios = require('axios');
var Promise = require('bluebird');
var async = require('async');

var igURL = 'https://www.instagram.com/';
var igPostURL = igURL + 'p/';
var dataExp = /window\._sharedData\s?=\s?({.+);<\/script>/;

var scrape = function(html) {
    var json = '';
    try {
        var dataString = html.match(dataExp)[0]
            .replace('window._sharedData = ','')
            .replace(';</script>','');
        json = JSON.parse(dataString);
    } catch(e) {
        console.error(e.message);
        return null;
    }
    return json;
};

// Retrieve Name, Description, followers number, following number
var propagateUserData = function(scrapedData) {
    var userData = {};
    if (scrapedData && scrapedData.entry_data &&
        scrapedData.entry_data.ProfilePage &&
        scrapedData.entry_data.ProfilePage[0] &&
        scrapedData.entry_data.ProfilePage[0].graphql &&
        scrapedData.entry_data.ProfilePage[0].graphql.user) {
            var user = scrapedData.entry_data.ProfilePage[0].graphql.user;
            userData = {
                name: user.full_name,
                description: user.biography,
                followers: user.edge_followed_by.count,
                following: user.edge_follow.count,
                profile_pic_url: user.profile_pic_url,
                is_private: user.is_private
            };
        }
    return userData;
};

// Retrieve the last 6 posts: ids and image URLs
var propagatePostData = function(scrapedData) {
    var limit = 6;
    var postData = {};
    if (scrapedData && scrapedData.entry_data &&
        scrapedData.entry_data.ProfilePage &&
        scrapedData.entry_data.ProfilePage[0] &&
        scrapedData.entry_data.ProfilePage[0].graphql &&
        scrapedData.entry_data.ProfilePage[0].graphql.user &&
        scrapedData.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media &&
        scrapedData.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.count > 0 &&
        scrapedData.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges) {
            var edges = scrapedData.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
            async.waterfall([
                (callback)=> {
                    var media = [];
                    var ctr = 0;
                    edges.forEach(post => {
                        if ((post.node.__typename === 'GraphSidecar' || post.node.__typename === 'GraphImage') && 
                            ctr < limit) {
                            media.push(exports.scrapePostData(post));
                            ctr += 1;
                        }
                    });
                    callback(null, media);
                }
            ], function(err, result) {
                postData = result;
            });

        }
    return postData;
};

exports.scrapePostData = function(post) {
    return {
        media_id : post.node.id,
        shortcode : post.node.shortcode,
        text : post.node.edge_media_to_caption.edges[0] && post.node.edge_media_to_caption.edges[0].node.text,
        comment_count : post.node.edge_media_to_comment.count,
        like_count : post.node.edge_liked_by.count,
        display_url : post.node.display_url,
        owner_id : post.node.owner.id,
        date : post.node.taken_at_timestamp,
        thumbnail : post.node.thumbnail_src,
        thumbnail_resource : post.node.thumbnail_resources
    }
}

exports.scrapeUserPage = function(instagramHandle) {
    // Make a request for an instagram user with a given handle
    return new Promise(function(resolve, reject){
        axios.get(igURL + instagramHandle)
            .then(function(response){
                var data = scrape(response.data);
                var userData = propagateUserData(data);
                var postData = propagatePostData(data);
                resolve({
                    user: userData,
                    posts: postData
                });
            })
            .catch(function(error){
                reject(new Error('An error occured.'));
            });
    });
}
