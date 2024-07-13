import ConsoleLog from '@winkgroup/console-log';
import Cron, { CronOptions } from '@winkgroup/cron';
import { DbVar } from '@winkgroup/db-mongo';

export interface CronMongoInput extends Partial<CronOptions> {
    name: string;
    dbVar: DbVar;
    everySeconds?: number;
}

export default class CronMongo extends Cron {
    name: string;
    dbVar: DbVar;
    protected isDbIdle = false;

    constructor(input: CronMongoInput) {
        super(input.everySeconds, input);
        this.name = input.name;
        this.dbVar = input.dbVar;
        this.dbVar.get('cron ' + this.name).then((value) => {
            if (value) this.lastRunAt = value;
            this.isDbIdle = true;
        });
    }

    async waitForDbIdle() {
        return new Promise<void>((resolve) => {
            const handler = setInterval(() => {
                if (this.isDbIdle) {
                    clearInterval(handler);
                    this.consoleLog.debug(`db is idle`);
                    resolve();
                } else this.consoleLog.debug(`waiting for db to be idle...`);
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
        return new Promise<void>((resolve) => {
            this.runCompleted(abort, resolve);
        });
    }
}
