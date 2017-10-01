import * as colors from 'colors';
import * as yargs from 'yargs';

// tslint:disable-next-line:no-unused-expression
yargs
  .usage('Usage: rockdisk <command> [options]')
  .commandDir('commands')
  .demandCommand(1)
  .strict()
  .help()
  .alias('help', 'h')
  .global('h')
  .recommendCommands()
  .fail((msg: string) => {
    yargs.showHelp();
    console.error(colors.red(msg));
    process.exit(1);
  })
  .epilog('Run `rockdisk COMMAND --help` for more information on specific commands.').argv;
