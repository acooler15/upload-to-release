const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function run() {
  try {
    const payload = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {}
    const { action: action, release: { id: release_id }} = payload
    // https://developer.github.com/v3/activity/events/types/#releaseevent
    switch (action) {
        case "published":
        case "created":
        case "prereleased":
            break
        default:
            console.log(`Skipping release: ${action}`)
            return
    }

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

    const token = core.getInput('repo-token', { required: true });

    const octokit = github.getOctokit(token);
    
    const name = core.getInput('name', { required: true });
    const path = core.getInput('path', { required: true });
    const contentType = core.getInput('content-type', { required: true });

    console.log(`Uploading ${path} to ${name} on release ${release_id} as Content-Type '${contentType}'`);

    const { data: { upload_url: url } } = await octokit.rest.repos.getRelease({owner, repo, release_id})
    console.log(`Upload URL: ${url}`)
    const { data: assets } = await octokit.rest.repos.listReleaseAssets({owner, repo, release_id})
    assets.filter(asset => asset).forEach(({ id: asset_id, name: asset_name }) => {
        if (asset_name == name) {
            octokit.rest.repos.deleteReleaseAsset({owner, repo, asset_id})
        }
    })

    const headers = {
        'content-type': contentType,
        'content-length': fs.statSync(path).size,
    }
    const file = fs.createReadStream(path)
    // console.log(octokit.rest.users.getAuthenticated())
    const { data: { browser_download_url: browser_download_url }} = await octokit.rest.repos.uploadReleaseAsset({
      owner: owner,
      repo: repo,
      release_id: release_id,
      name: name,
      data: file
    })
    console.log(`Download URL: ${browser_download_url}`)
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
