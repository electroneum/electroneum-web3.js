﻿/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/

import { AbiParameter } from '@etn-sc/web3-types';
// eslint-disable-next-line require-extensions/require-extensions
import { ShortValidationSchema } from '../types';

export const isAbiParameterSchema = (
	schema: string | ShortValidationSchema | AbiParameter,
): schema is AbiParameter => typeof schema === 'object' && 'type' in schema && 'name' in schema;
