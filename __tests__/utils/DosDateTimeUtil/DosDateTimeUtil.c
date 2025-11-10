#include <windows.h>
#include <tchar.h>
#include <strsafe.h>
#include <Intsafe.h>

#define parse_arg(name, index)                                                \
    if (argc > index && (S_OK != IntToWord(_ttoi(argv[index]), &st.w##name))) \
    {                                                                         \
        printf("Failed to parse %s argument\n", #name);                       \
        usage(program_name);                                                  \
        return 1;                                                             \
    }

void usage(TCHAR *program_name)
{
    _tprintf(TEXT("Usage: %s [1980<Year<2107] [Month=1] [Day=1] [Hour] [Minute] [Second] [Milliseconds]\n"), program_name);
    _tprintf(TEXT("       When no args are supplied, current time will be used.\n"));
    _tprintf(TEXT("       Unsupplied args are set to 0\n"));
}

int _tmain(int argc, TCHAR *argv[])
{
    TCHAR *program_name = argv[0];

    if (argc > 8)
    {
        printf("To many arguments\n");
        usage(program_name);
        return 1;
    }

    SYSTEMTIME st = {
        .wYear = 1980,
        .wMonth = 1,
        .wDay = 1,
    };

    if (argc == 1)
        GetSystemTime(&st);

    parse_arg(Year, 1);
    if (st.wYear < 1980 || st.wYear > 2107)
    {
        printf("Invalid Year argument '%d'. Year must be between 1980 and 2107\n", st.wYear);
        return 1;
    }
    parse_arg(Month, 2);
    if (st.wMonth < 1)
    {
        printf("Invalid Month argument '%d'. Month must be between 1 and 12\n", st.wMonth);
        return 1;
    }
    parse_arg(Day, 3);
    if (st.wDay < 1)
    {
        printf("Invalid Day argument '%d'. Day must be between 1 and 31\n", st.wDay);
        return 1;
    }
    parse_arg(Hour, 4);
    parse_arg(Minute, 5);
    parse_arg(Second, 6);
    parse_arg(Milliseconds, 7);

    FILETIME ft;
    SystemTimeToFileTime(&st, &ft);

    WORD dosDate, dosTime;
    if (!FileTimeToDosDateTime(&ft, &dosDate, &dosTime))
    {
        printf("FileTimeToDosDateTime failed with %d\n", GetLastError());
        return 1;
    }

    TCHAR datetimeStr[32];
    if (S_OK != StringCchPrintf(datetimeStr, 32,
                                TEXT("%02d.%02d.%d  %02d:%02d:%02d.%03d"),
                                st.wDay, st.wMonth, st.wYear,
                                st.wHour, st.wMinute, st.wSecond, st.wMilliseconds))
    {
        printf("StringCchPrintf failed with %d\n", GetLastError());
        return 1;
    }

    _tprintf(TEXT("Time: %s\n"), datetimeStr);
    printf("DOS Date:         0x%04x\n", dosDate);
    printf("DOS Time:         0x%04x\n", dosTime);
    printf("DOS DateTime:     0x%08x\n", dosDate << 16 | dosTime);

    return 0;
}
