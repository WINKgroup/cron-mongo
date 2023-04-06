import ConsoleLog from '@winkgroup/console-log';
import Cron from '@winkgroup/cron';
import { DbVar } from '@winkgroup/db-mongo';

export default class CronMongo extends Cron {
    name: string;
    dbVar: DbVar;
    protected isDbIdle = false;

    constructor(
        name: string,
        dbVar: DbVar,
        everySeconds = 0,
        consoleLog?: ConsoleLog
    ) {
        super(everySeconds, consoleLog);
        this.name = name;
        this.dbVar = dbVar;
        this.dbVar.get('cron ' + this.name).then(() => (this.isDbIdle = true));
    }

    tryStartRun(force?: boolean) {
        if (!force && !this.isDbIdle) {
            this.consoleLog.debug('cron operating on DB: not starting yet');
            return false;
        }
        return super.tryStartRun(force);
    }

    runCompleted() {
        super.runCompleted();
        this.isDbIdle = false;
        this.dbVar
            .set('cron ' + this.name, this.lastRunAt)
            .then(() => (this.isDbIdle = true));
    }
}
