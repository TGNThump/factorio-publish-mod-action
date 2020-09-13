const core = require('@actions/core');
const { jar } = require('request');
const WebRequest = require('web-request');
const fs = require('fs');

async function run() {

  let cookieJar = jar();

  const username = core.getInput("mod_portal_username", {required: true});
  const password = core.getInput("mod_portal_password", {required: true});
  const modName = core.getInput("mod_name", {required: true});

  await login(cookieJar, username, password);
  let uploadToken = await getUploadToken(cookieJar, modName);

  const assetPath = core.getInput("asset_path", {required: true});
  const assetName = core.getInput("asset_name", {required: true});

  const uploadResult = await uploadAsset(cookieJar, uploadToken, assetPath, assetName);

  await updateModMetadata(cookieJar, modName, uploadResult, assetPath, assetName);
}

async function login(cookieJar, username, password) {
  try {
    const loginForm = await WebRequest.get("https://factorio.com/login?mods=1&next=%2Ftrending",{jar:cookieJar});
    const loginToken = ((loginForm.content.match(/<input [^>]+"csrf_token"[^>]+>/)||[])[0].match(/value="([^"]*)"/)||[])[1];

    core.info(`Logging in to Factorio Mod Portal as '${username}'\r\n`);

    const loginResult = await WebRequest.post("https://factorio.com/login",{
      jar:cookieJar,
      throwResponseError: true,
      headers:{
        referer: "https://factorio.com/login?mods=1&next=%2Ftrending"
      },
      form:{
        csrf_token: loginToken,
        username_or_email: username,
        password: password,
        next_url: "/trending",
        next_mods: false
      }
    });

    const loginError = loginResult.content.match(/<ul class="flashes">[\s\n]*<li>(.*)<\/li>/);
    if (loginError) {// noinspection ExceptionCaughtLocallyJS
      core.setFailed(loginError[1]);
      process.exit(-1);
    }

  } catch (error) {
    core.setFailed(`Failed to log in to Mod Portal: \r\n${error.toString()}\r\n`);
    process.exit(-1);
  }
}

async function getUploadToken(cookieJar, modName) {
  try {
    const uploadForm = await WebRequest.get(`https://mods.factorio.com/mod/${modName}/downloads/edit`,{jar:cookieJar, throwResponseError: true});
    return uploadForm.content.match(/\n\s*token:\s*'([^']*)'/)[1];
  } catch (error) {
    core.setFailed("Failed to get upload token from Factorio Mod Portal: " + error.toString());
    process.exit(-1);
  }
}

async function uploadAsset(cookieJar, uploadToken, assetPath, assetName) {
  let uploadResult;
  try {
    uploadResult = await WebRequest.post(`https://direct.mods-data.factorio.com/upload/mod/${uploadToken}`, {
      jar:cookieJar,
      throwResponseError: true,
      formData:{
        file:{
          value:  fs.createReadStream(assetPath),
          options: {
            filename: assetName,
            contentType: 'application/x-zip-compressed'
          }
        }
      }});
  } catch (error) {
    core.setFailed("Failed to upload zip to Factorio Mod Portal: " + error.toString());
    process.exit(-1);
  }

  return JSON.parse(uploadResult.content);
}

async function updateModMetadata(cookieJar, modName, uploadResult, assetPath, assetName) {
  try {
    const postResult = await WebRequest.post(`https://mods.factorio.com/mod/${modName}/downloads/edit`, {
      jar:cookieJar,
      throwResponseError: true,
      form:{
        file:undefined,
        info_json:uploadResult.info,
        changelog:uploadResult.changelog,
        filename:uploadResult.filename,
        file_size: fs.statSync(assetPath).size ,
        thumbnail:uploadResult.thumbnail
      }
    });

    if (postResult.statusCode === 302) {
      core.info(`Published ${assetName}`);
    } else {
      core.setFailed(postResult.content.match(/category:\s*'error',\s*\n\s*message:\s*'([^']*)'/)[1]);
    }
  } catch (error) {
    core.setFailed("Failed to post update to Mod Portal: " + error.toString());
  }
}

run();
