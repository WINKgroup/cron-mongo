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
        this.dbVar.get('cron ' + this.name).then((value) => {
            if (value) this.lastRunAt = value;
            this.isDbIdle = true;
        });
    }

    async waitForDbIdle() {
        return new Promise<void>((resolve) => {
            const handler = setInterval(() => {
                this.consoleLog.debug(`waiting for db to be idle...`);
                if (this.isDbIdle) {
                    clearInterval(handler);
                    resolve();
                }
            }, 100);
        });
    }

    async checkDbThenTryStartRun(force?: boolean) {
        if (this.everySeconds === 0 || force) return this.tryStartRun(force);
        await this.waitForDbIdle();
        const lastRunAt = (await this.dbVar.get('cron ' + this.name)) as number;
        if (lastRunAt) this.lastRunAt = lastRunAt;
        return this.tryStartRun(force);
    }

    tryStartRun(force?: boolean) {
        if (!force && this.everySeconds > 0 && !this.isDbIdle) {
            this.consoleLog.debug('cron operating on DB: not starting yet');
            return false;
        }
        return super.tryStartRun(force);
    }

    runCompleted(abort = false, callback?: () => void) {
        super.runCompleted(abort);
        if (!abort) {
            this.isDbIdle = false;
            this.dbVar.set('cron ' + this.name, this.lastRunAt).then(() => {
                this.isDbIdle = true;
                if (callback) callback();
            });
        }
    }

    runCompletedPromise(abort = false) {
        return new Promise<void>( resolve => {
            this.runCompleted( abort, resolve )
        })
    }
}
