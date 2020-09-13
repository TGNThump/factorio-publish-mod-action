# Factorio Publish Mod Action

The code in this action is a modified version of the [mod portal upload routine](https://github.com/justarandomgeek/vscode-factoriomod-debug/blob/2d0016abb4df828d8ab07078d23392d7cd799a08/src/ModPackageProvider.ts#L376) from [VSCode Factorio Mod Debug](https://github.com/justarandomgeek/vscode-factoriomod-debug).


## Package for distribution

GitHub Actions will run the entry point from the action.yml. Packaging assembles the code into one file that can be checked in to Git, enabling fast and reliable execution and preventing the need to check in node_modules.

Actions are run from GitHub repos.  Packaging the action will create a packaged action in the dist folder.

Run prepare

```bash
npm run prepare
```

Since the packaged index.js is run from the dist folder.

```bash
git add dist
```

## Create a release branch

Users shouldn't consume the action from master since that would be latest code and actions can break compatibility between major versions.

Checkin to the v1 release branch

```bash
git checkout -b v1
git commit -a -m "v1 release"
```

```bash
git push origin v1
```

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Usage

You can now consume the action by referencing the v1 branch

```yaml
uses: TGNThump/factorio-publish-mod-action@v1
with:
  mod_portal_username: USERNAME
  mod_portal_password: ${{secrets.FACTORIO_MOD_PORTAL_PASSWORD}}
  mod_name: mod-name
  asset_path: ./path/to/mod_name_1.0.zip
  asset_name: mod_name_1.0.zip
```