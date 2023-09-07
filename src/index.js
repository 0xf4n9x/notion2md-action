/*
 * @Author: Dorad, ddxi@qq.com
 * @Date: 2023-09-02 10:54:25 +08:00
 * @LastEditors: Dorad, ddxi@qq.com
 * @LastEditTime: 2023-09-03 22:29:17 +08:00
 * @FilePath: \src\index.js
 * @Description: 
 * 
 * Copyright (c) 2023 by Dorad (ddxi@qq.com), All Rights Reserved.
 */
const notion = require("./notion");
const core = require("@actions/core");

function isJson(str) {
  try {
    const obj = JSON.parse(str);
    if (obj && typeof obj == "object") return true;
  } catch (e) { }
  return false;
}

var migrate_image = core.getInput("pic_migrate") === "true" || false;
const picBedConfigStr = core.getInput("pic_bed_config") || "{}";

// test the picBed config
if (!isJson(picBedConfigStr)) {
  core.warning("pic_bed_config is not a valid json string, use default config: {}, and set migrate_image to false.");
  migrate_image = false;
}

var pic_bed_config = {};

if (migrate_image) {
  core.info("migrate_image is true, use pic_bed_config to upload images.");
  pic_bed_config = JSON.parse(picBedConfigStr);
}

var keys_to_keep = core.getInput("keys_to_keep");
if (keys_to_keep && keys_to_keep.trim().length > 0) {
  keys_to_keep = keys_to_keep.split(",").map((key) => key.trim());
}

var excluded_metas = core.getInput("excluded_metas") || [];
if(excluded_metas){
  excluded_metas = excluded_metas.split(',');
  // use trim to remove space for excluded_metas;
  excluded_metas = excluded_metas.forEach((v)=>v.trim());
  excluded_metas = excluded_metas.filter((v)=>v);
}

let config = {
  notion_secret: core.getInput("notion_secret"),
  database_id: core.getInput("database_id"),
  migrate_image: migrate_image || false,
  picBed: pic_bed_config || {},
  pic_compress: core.getInput("pic_compress") === "true" || false,
  status: {
    name: core.getInput("status_name") || "status",
    published: core.getInput("status_published") || "已发布",
  },
  output_dir: {
    page: core.getInput("output_page_dir") || "source/",
    post: core.getInput("output_post_dir") || "source/_posts/notion/",
    clean_unpublished_post: core.getInput("clean_unpublished_post") === "true" || false,
  },
  keys_to_keep: keys_to_keep,
  last_sync_datetime: core.getInput("last_sync_datetime") || null,
  excluded_metas: excluded_metas || [],
  timezone: core.getInput("timezone") || "Asia/Shanghai",
};

// add current running file dir to PATH
process.env.PATH = __dirname + ":" + process.env.PATH;
// add all the exec file under __dirname/vendor* dirs the executable permission expect the source dir
const { execSync } = require("child_process");
const { url } = require("inspector");
const { BADFAMILY } = require("dns");
// try to find all the files under __dirname/vendor* dirs and set the executable permission
try {
  execSync(`find ${__dirname}/vendor* -type f -not -name "*.tar.gz" -exec chmod +x {} \\;`);
} catch (e) {
  core.error(`Failed to set the executable permission for all the files under ${__dirname}/vendor* dirs, error: ${e}`);
}

(async function () {
  core.startGroup('Notion2markdown-action')
  notion.init(config);
  // get output
  const out = await notion.sync();
  // set output
  core.setOutput("updated_count", out.handled + out.deleted);
  core.endGroup('Notion2markdown-action');
  core.notice(`Notion2markdown-action finished, queried: ${out.queried}, handled: ${out.handled} and deleted: ${out.deleted}`)
})();
