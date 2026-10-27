import { Schema, Table, column } from '@powersync/common';

const storage_check = new Table({ checked_at: column.text }, { localOnly: true });

export const schema = new Schema({ storage_check });
