/*
   Copyright 2016 Opto 22

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


import should = require('should');
import assert = require('assert');
import { PacWriteNodeImpl } from '../../nodes/write-node';

var writeValueToWriteObject = PacWriteNodeImpl.writeValueToWriteObject;

describe('NODE', function()
{
    it('#writeValueToWriteObject - dig-output', function()
    {
        var dataType = 'dig-output';
        should(writeValueToWriteObject(dataType, 'off')).be.eql({ value: false });
        should(writeValueToWriteObject(dataType, ' OFF ')).be.eql({ value: false });
        should(writeValueToWriteObject(dataType, 'false')).be.eql({ value: false });
        should(writeValueToWriteObject(dataType, '  FALSE  ')).be.eql({ value: false });
        should(writeValueToWriteObject(dataType, '0')).be.eql({ value: false });
        should(writeValueToWriteObject(dataType, ' 0 ')).be.eql({ value: false });

        should(writeValueToWriteObject(dataType, 'true')).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, ' TrUE ')).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, '1')).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, '    1')).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, '-1 ')).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, 'on')).be.eql({ value: true });

        should(writeValueToWriteObject(dataType, true)).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, false)).be.eql({ value: false });

        should(writeValueToWriteObject(dataType, 0)).be.eql({ value: false });
        should(writeValueToWriteObject(dataType, -1)).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, 1)).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, 22)).be.eql({ value: true });
        should(writeValueToWriteObject(dataType, -22)).be.eql({ value: true });

        should(function() { writeValueToWriteObject(dataType, '') }).throw();
        should(function() { writeValueToWriteObject(dataType, ' ') }).throw();
        should(function() { writeValueToWriteObject(dataType, ' anything ') }).throw();
        should(function() { writeValueToWriteObject(dataType, 'anything') }).throw();
        should(function() { writeValueToWriteObject(dataType, '1.0') }).throw();
        should(function() { writeValueToWriteObject(dataType, '2') }).throw();

        // Try to sneak in some non-string types.
        should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
        should(function() { writeValueToWriteObject(dataType, <any>['abc']) }).throw();
        should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();
    });

    it('#writeValueToWriteObject - int32-variable', function()
    {
        context('with good input', function() 
        {
            var dataType = 'int32-variable';

            // Try some booleans for the value.
            should(writeValueToWriteObject(dataType, true)).be.eql({ value: 1 });
            should(writeValueToWriteObject(dataType, false)).be.eql({ value: 0 });

            // Try some numbers for the value.
            should(writeValueToWriteObject(dataType, -1)).be.eql({ value: -1 });
            should(writeValueToWriteObject(dataType, 0)).be.eql({ value: 0 });
            should(writeValueToWriteObject(dataType, 1)).be.eql({ value: 1 });
            should(writeValueToWriteObject(dataType, 2147483647)).be.eql({ value: 2147483647 });
            should(writeValueToWriteObject(dataType, -2147483648)).be.eql({ value: -2147483648 });

            // Try some strings for the value.
            should(writeValueToWriteObject(dataType, '-1')).be.eql({ value: -1 });
            should(writeValueToWriteObject(dataType, '0')).be.eql({ value: 0 });
            should(writeValueToWriteObject(dataType, '1')).be.eql({ value: 1 });
            should(writeValueToWriteObject(dataType, '2147483647')).be.eql({ value: 2147483647 });
            should(writeValueToWriteObject(dataType, '-2147483648')).be.eql({ value: -2147483648 });
            should(writeValueToWriteObject(dataType, '123')).be.eql({ value: 123 });
            should(writeValueToWriteObject(dataType, '12.34')).be.eql({ value: 12.34 });

            // Whitespace shouldn't matter.
            should(writeValueToWriteObject(dataType, '  123')).be.eql({ value: 123 });
            should(writeValueToWriteObject(dataType, '123  ')).be.eql({ value: 123 });
            should(writeValueToWriteObject(dataType, '  123  ')).be.eql({ value: 123 });

            // No range checking is done, on purpose.
            should(writeValueToWriteObject(dataType, 2147483648)).be.eql({ value: 2147483648 });
            should(writeValueToWriteObject(dataType, '2147483648')).be.eql({ value: 2147483648 });
        });

        context('with bad input', function() 
        {
            var dataType = 'int32-variable';

            should(function() { writeValueToWriteObject(dataType, '') }).throw();
            should(function() { writeValueToWriteObject(dataType, '   ') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'abc') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'seven') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'seven') }).throw();

            // Try to sneak in some non-string types.
            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>['abc']) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();
        });
    });


    it('#writeValueToWriteObject - int64-variable', function()
    {
        context('with good input', function() 
        {
            var dataType = 'int64-variable';

            should(writeValueToWriteObject(dataType, true)).be.eql({ value: '1' });
            should(writeValueToWriteObject(dataType, false)).be.eql({ value: '0' });

            should(writeValueToWriteObject(dataType, -1)).be.eql({ value: '-1' });
            should(writeValueToWriteObject(dataType, 0)).be.eql({ value: '0' });
            should(writeValueToWriteObject(dataType, 1)).be.eql({ value: '1' });

            // A loss of precission is expected, from 64-bit floats for integers.
            should(writeValueToWriteObject(dataType, 9223372036854775807)).be.eql(
                { value: '9223372036854776000' })
            should(writeValueToWriteObject(dataType, 9223372036854775808)).be.eql(
                { value: '9223372036854776000' });

            should(writeValueToWriteObject(dataType, '-1')).be.eql({ value: '-1' });
            should(writeValueToWriteObject(dataType, '0')).be.eql({ value: '0' });
            should(writeValueToWriteObject(dataType, '1')).be.eql({ value: '1' });

            should(writeValueToWriteObject(dataType, '9223372036854775807')).be.eql(
                { value: '9223372036854775807' });

            // no range checking here, on purpose
            should(writeValueToWriteObject(dataType, '9223372036854775808')).be.eql(
                { value: '9223372036854775808' });

            should(writeValueToWriteObject(dataType, '-9223372036854775808')).be.eql(
                { value: '-9223372036854775808' });

            should(writeValueToWriteObject(dataType, '123')).be.eql({ value: '123' });
            should(writeValueToWriteObject(dataType, '12.34')).be.eql({ value: '12.34' });

            should(writeValueToWriteObject(dataType, '  123')).be.eql({ value: '123' });
            should(writeValueToWriteObject(dataType, '123  ')).be.eql({ value: '123' });
            should(writeValueToWriteObject(dataType, '  123  ')).be.eql({ value: '123' });
        });

        context('with bad input', function() 
        {
            var dataType = 'int64-variable';

            should(function() { writeValueToWriteObject(dataType, 'abc') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'seven') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'seven') }).throw();

            // Try to sneak in some non-string types.
            should(function() { writeValueToWriteObject(dataType, '') }).throw();
            should(function() { writeValueToWriteObject(dataType, '   ') }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>['abc']) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();
        });
    });


    it('#writeValueToWriteObject - float-variable', function()
    {
        context('with good input', function() 
        {
            var dataType = 'float-variable';

            should(writeValueToWriteObject(dataType, true)).be.eql({ value: 1 });
            should(writeValueToWriteObject(dataType, false)).be.eql({ value: 0 });

            should(writeValueToWriteObject(dataType, -1)).be.eql({ value: -1 });
            should(writeValueToWriteObject(dataType, 0)).be.eql({ value: 0 });
            should(writeValueToWriteObject(dataType, 1)).be.eql({ value: 1 });
            should(writeValueToWriteObject(dataType, 3.14159)).be.eql({ value: 3.14159 });
            should(writeValueToWriteObject(dataType, 1234.5678)).be.eql({ value: 1234.5678 });
            should(writeValueToWriteObject(dataType, -1234.5678)).be.eql({ value: -1234.5678 });
            should(writeValueToWriteObject(dataType, 123e45)).be.eql({ value: 123e45 });
            should(writeValueToWriteObject(dataType, 12.3e45)).be.eql({ value: 1.23e46 });
            should(writeValueToWriteObject(dataType, 12.3e-45)).be.eql({ value: 1.23e-44 });

            should(writeValueToWriteObject(dataType, '-1')).be.eql({ value: -1 });
            should(writeValueToWriteObject(dataType, '0')).be.eql({ value: 0 });
            should(writeValueToWriteObject(dataType, '1')).be.eql({ value: 1 });
            should(writeValueToWriteObject(dataType, '3.14159')).be.eql({ value: 3.14159 });
            should(writeValueToWriteObject(dataType, '1234.5678')).be.eql({ value: 1234.5678 });
            should(writeValueToWriteObject(dataType, '-1234.5678')).be.eql({ value: -1234.5678 });
            should(writeValueToWriteObject(dataType, '123e45')).be.eql({ value: 123e45 });
            should(writeValueToWriteObject(dataType, '12.3e45')).be.eql({ value: 1.23e46 });
            should(writeValueToWriteObject(dataType, '12.3e-45')).be.eql({ value: 1.23e-44 });

            should(writeValueToWriteObject(dataType, '12.34')).be.eql({ value: 12.34 });

            should(writeValueToWriteObject(dataType, '  12.3')).be.eql({ value: 12.3 });
            should(writeValueToWriteObject(dataType, '12.3  ')).be.eql({ value: 12.3 });
            should(writeValueToWriteObject(dataType, '  12.3  ')).be.eql({ value: 12.3 });
        });

        context('with bad input', function() 
        {
            var dataType = 'float-variable';

            should(function() { writeValueToWriteObject(dataType, 'abc') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'seven') }).throw();
            should(function() { writeValueToWriteObject(dataType, 'seven') }).throw();

            // Try to sneak in some non-string types.
            should(function() { writeValueToWriteObject(dataType, '') }).throw();
            should(function() { writeValueToWriteObject(dataType, '   ') }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>['abc']) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();
        });
    });

    it('#writeValueToWriteObject - string-variable', function()
    {
        context('with string input', function() 
        {
            var dataType = 'string-variable';
            should(writeValueToWriteObject(dataType, '')).be.eql({ value: '' });
            should(writeValueToWriteObject(dataType, ' ')).be.eql({ value: ' ' });
            should(writeValueToWriteObject(dataType, 'a')).be.eql({ value: 'a' });
            should(writeValueToWriteObject(dataType, 'A B C')).be.eql({ value: 'A B C' });

            should(writeValueToWriteObject(dataType, true)).be.eql({ value: 'true' });
            should(writeValueToWriteObject(dataType, false)).be.eql({ value: 'false' });
            should(writeValueToWriteObject(dataType, 0)).be.eql({ value: '0' });
            should(writeValueToWriteObject(dataType, 1.23)).be.eql({ value: '1.23' });
        });

        context('without string input', function() 
        {
            var dataType = 'string-variable';

            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>['abc']) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();
        });
    });

    it('#writeValueToWriteObject - int32-table', function()
    {
        context('with good input', function() 
        {
            var dataType = 'int32-table';

            should(writeValueToWriteObject(dataType, '')).be.eql([]);
            should(writeValueToWriteObject(dataType, ' ')).be.eql([]);
            should(writeValueToWriteObject(dataType, '1')).be.eql([1]);
            should(writeValueToWriteObject(dataType, '1, 2')).be.eql([1, 2]);

            should(writeValueToWriteObject(dataType, true)).be.eql([1]);
            should(writeValueToWriteObject(dataType, false)).be.eql([0]);
            should(writeValueToWriteObject(dataType, 1)).be.eql([1]);

            should(writeValueToWriteObject(dataType, [])).be.eql([]);
            should(writeValueToWriteObject(dataType, [1])).be.eql([1]);
            should(writeValueToWriteObject(dataType, [1, 2.2, -3.3])).be.eql([1, 2.2, -3.3]);

            should(writeValueToWriteObject(dataType, ['1'])).be.eql(['1']);
        });

        context('with bad input', function() 
        {
            var dataType = 'int32-table';

            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();
            should(function() { writeValueToWriteObject(dataType, '  [ 1, 2 ] 3 ') }).throw();
        });
    });

    it('#writeValueToWriteObject - int64-table', function()
    {
        context('with good input', function() 
        {
            var dataType = 'int64-table';

            // If needed, the function fill add brackets around the string.
            // Then it's parsed as a JSON array.
            should(writeValueToWriteObject(dataType, '')).be.eql([]);
            should(writeValueToWriteObject(dataType, ' ')).be.eql([]);
            should(writeValueToWriteObject(dataType, '"1"')).be.eql(['1']);
            should(writeValueToWriteObject(dataType, '"1", "2"')).be.eql(['1', '2']);

            // Using strings for Int64 values allows a few oddities to creep in. We don't do much
            // checking here, so that the PAC can just handle it itself.
            should(writeValueToWriteObject(dataType, '"1", "a"')).be.eql(['1', 'a']);

            should(writeValueToWriteObject(dataType, true)).be.eql(['1']);
            should(writeValueToWriteObject(dataType, false)).be.eql(['0']);
            should(writeValueToWriteObject(dataType, 1)).be.eql(['1']);

            should(writeValueToWriteObject(dataType, [])).be.eql([]);

            // We dont' process arrays, so the API may not like it.
            should(writeValueToWriteObject(dataType, [1])).be.eql([1]);
            should(writeValueToWriteObject(dataType, ['a', 'b'])).be.eql(['a', 'b']);

            should(writeValueToWriteObject(dataType, ['1', '2.2', '-3.3'])).be.eql(
                ['1', '2.2', '-3.3']);

            should(writeValueToWriteObject(dataType, ['1'])).be.eql(['1']);
        });

        context('with bad input', function() 
        {
            var dataType = 'int64-table';

            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();

            // JSON requires the strings to use double-quotes, so this is an error.
            should(function() { writeValueToWriteObject(dataType, "'1', '2'") }).throw();;

            should(function() { writeValueToWriteObject(dataType, '  [ 1, 2 ] 3 ') }).throw();
            should(function() { writeValueToWriteObject(dataType, '  [ "1", 2 ] 3 ') }).throw();
        });
    });

    it('#writeValueToWriteObject - float-table', function()
    {

        context('with good input', function() 
        {
            var dataType = 'float-table';

            // Only strings are accepted by this function, as it's expected to come from the UI.
            // If needed, the function fill add brackets around the string.
            // Then it's parsed as a JSON array.
            should(writeValueToWriteObject(dataType, '')).be.eql([]);
            should(writeValueToWriteObject(dataType, ' ')).be.eql([]);
            should(writeValueToWriteObject(dataType, '1')).be.eql([1]);
            should(writeValueToWriteObject(dataType, '1, 2.2')).be.eql([1, 2.2]);

            should(writeValueToWriteObject(dataType, '[]')).be.eql([]);
            should(writeValueToWriteObject(dataType, '[ ]')).be.eql([]);
            should(writeValueToWriteObject(dataType, '[1]')).be.eql([1]);
            should(writeValueToWriteObject(dataType, '[1, 2.2]')).be.eql([1, 2.2]);
            should(writeValueToWriteObject(dataType, '  [ 1, 2.2 ]  ')).be.eql([1, 2.2]);

            should(writeValueToWriteObject(dataType, true)).be.eql([1])
            should(writeValueToWriteObject(dataType, false)).be.eql([0]);
            should(writeValueToWriteObject(dataType, 1)).be.eql([1]);
            should(writeValueToWriteObject(dataType, -12345.6789)).be.eql([-12345.6789]);
            should(writeValueToWriteObject(dataType, [1])).be.eql([1]);
            should(writeValueToWriteObject(dataType, [1, 2.2, -3.3])).be.eql([1, 2.2, -3.3]);

            // We dont' process arrays, so the API may not like it
            should(writeValueToWriteObject(dataType, ['a', 'b'])).be.eql(['a', 'b']);
        });

        context('with bad input', function() 
        {
            var dataType = 'float-table';

            // Only strings are accepted by this function, as it's expected to come from the UI.
            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();

            should(function() { writeValueToWriteObject(dataType, '  [ 1, 2.2 ] 3.3 ') }).throw();
        });
    });

    it('#writeValueToWriteObject - string-table', function()
    {

        context('with good input', function() 
        {
            var dataType = 'string-table';

            // Only strings are accepted by this function, as it's expected to come from the UI.
            // If needed, the function fill add brackets around the string.
            // Then it's parsed as a JSON array.
            should(writeValueToWriteObject(dataType, '')).be.eql([]);
            should(writeValueToWriteObject(dataType, ' ')).be.eql([]);
            should(writeValueToWriteObject(dataType, '"1"')).be.eql(['1']);
            should(writeValueToWriteObject(dataType, '"a"')).be.eql(['a']);
            should(writeValueToWriteObject(dataType, '" a b c "')).be.eql([' a b c ']);
            should(writeValueToWriteObject(dataType, '"a", "bc", " D "')).be.eql(['a', 'bc', ' D ']);

            should(writeValueToWriteObject(dataType, '[]')).be.eql([]);
            should(writeValueToWriteObject(dataType, '[ ]')).be.eql([]);
            should(writeValueToWriteObject(dataType, '["a"]')).be.eql(["a"]);
            should(writeValueToWriteObject(dataType, '["a", " b c " ]')).be.eql(['a', ' b c ']);
            should(writeValueToWriteObject(dataType, '  [ "A", " B C " ]  ')).be.eql(['A', ' B C ']);

            should(writeValueToWriteObject(dataType, true)).be.eql(['true'])
            should(writeValueToWriteObject(dataType, false)).be.eql(['false']);
            should(writeValueToWriteObject(dataType, 1)).be.eql(['1']);
            should(writeValueToWriteObject(dataType, -12345.6789)).be.eql(['-12345.6789']);
            should(writeValueToWriteObject(dataType, [1])).be.eql([1]);
            should(writeValueToWriteObject(dataType, [1, 2.2, -3.3])).be.eql([1, 2.2, -3.3]);
            should(writeValueToWriteObject(dataType, ['a', 'bc', ''])).be.eql(['a', 'bc', '']);
        });

        context('with bad input', function() 
        {
            var dataType = 'string-table';

            // Only strings are accepted by this function, as it's expected to come from the UI.
            should(function() { writeValueToWriteObject(dataType, <any>null) }).throw();
            should(function() { writeValueToWriteObject(dataType, <any>{ value: 'abc' }) }).throw();

            should(function() { writeValueToWriteObject(dataType, '  [ "a", "b" ] "c" ') }).throw();
        });
    });
});
